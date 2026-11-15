import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { TicketApiService } from '../core/ticket-api.service';
import { DEFAULT_FILTERS, NewTicket, Ticket, TicketUpdate } from '../core/ticket.model';
import { createSeedTickets } from '../core/ticket.seed';
import { TicketStore } from './ticket-store.service';

describe('TicketStore migration behavior contract', () => {
  const tickets = createSeedTickets();
  const update: TicketUpdate = {
    status: 'Resolved',
    priority: 'Urgent',
    assignee: 'Alex Morgan',
    note: 'Fixed.',
  };
  const draft: NewTicket = {
    title: 'New issue',
    customer: 'Example',
    email: 'a@b.test',
    description: 'Details',
    priority: 'Low',
  };
  const created: Ticket = { ...tickets[0], ...draft, id: 'NS-1053' };
  let api: {
    list: ReturnType<typeof vi.fn<() => Observable<readonly Ticket[]>>>;
    create: ReturnType<typeof vi.fn<(draft: NewTicket) => Observable<Ticket>>>;
    update: ReturnType<typeof vi.fn<(id: string, update: TicketUpdate) => Observable<Ticket>>>;
  };
  let store: TicketStore;

  beforeEach(() => {
    api = {
      list: vi.fn<() => Observable<readonly Ticket[]>>(() => of(tickets)),
      create: vi.fn<(draft: NewTicket) => Observable<Ticket>>(() => of(created)),
      update: vi.fn<(id: string, update: TicketUpdate) => Observable<Ticket>>(() =>
        of({ ...tickets[0], status: 'Resolved' }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [TicketStore, { provide: TicketApiService, useValue: api }],
    });
    store = TestBed.inject(TicketStore);
  });

  afterEach(() => vi.useRealTimers());

  it('shares loaded data rather than refetching for each subscriber', async () => {
    await firstValueFrom(store.tickets$);
    await firstValueFrom(store.tickets$);
    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('debounces text search but applies dropdown filters immediately', async () => {
    vi.useFakeTimers();
    let visible: readonly Ticket[] = [];
    const subscription = store.visibleTickets$.subscribe((value) => {
      visible = value;
    });
    store.setFilters({ ...DEFAULT_FILTERS, status: 'Open' });
    expect(visible).toHaveLength(5);
    store.setFilters({ ...DEFAULT_FILTERS, status: 'Open', query: 'acme' });
    expect(visible).toHaveLength(5);
    await vi.advanceTimersByTimeAsync(250);
    expect(visible.map((ticket) => ticket.id)).toEqual(['NS-1041']);
    subscription.unsubscribe();
  });

  it('preserves selection when filters hide a ticket', async () => {
    store.select(tickets[0].id);
    store.setFilters({ ...DEFAULT_FILTERS, status: 'Resolved' });
    expect((await firstValueFrom(store.selectedTicket$))?.id).toBe(tickets[0].id);
  });

  it('keeps stale data on a failed refresh and recovers on retry', async () => {
    api.list.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Offline' } })),
    );
    store.reload();
    expect(await firstValueFrom(store.loadError$)).toBe('Offline');
    expect(await firstValueFrom(store.tickets$)).toEqual(tickets);
    expect(await firstValueFrom(store.loading$)).toBe(false);
    store.reload();
    expect(await firstValueFrom(store.loadError$)).toBeNull();
    expect(api.list).toHaveBeenCalledTimes(3);
  });

  it('cancels an older load so it cannot overwrite newer results', async () => {
    const older = new Subject<readonly Ticket[]>();
    const newer = new Subject<readonly Ticket[]>();
    api.list.mockReturnValueOnce(older).mockReturnValueOnce(newer);
    store.reload();
    store.reload();
    expect(await firstValueFrom(store.loading$)).toBe(true);
    newer.next([tickets[0]]);
    newer.complete();
    older.next(tickets);
    older.complete();
    expect(await firstValueFrom(store.tickets$)).toHaveLength(1);
    expect(await firstValueFrom(store.loading$)).toBe(false);
  });

  it('ignores double submissions and blocks refresh and selection while saving', async () => {
    const pending = new Subject<Ticket>();
    api.update.mockReturnValue(pending);
    store.select(tickets[0].id);
    store.update(tickets[0].id, update);
    store.update(tickets[0].id, update);
    store.select(tickets[1].id);
    store.reload();
    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledTimes(1);
    expect((await firstValueFrom(store.selectedTicket$))?.id).toBe(tickets[0].id);
    expect(await firstValueFrom(store.saving$)).toBe(true);
    pending.next({ ...tickets[0], status: 'Resolved' });
    pending.complete();
    expect(await firstValueFrom(store.saving$)).toBe(false);
    expect((await firstValueFrom(store.tickets$))[0].status).toBe('Resolved');
  });

  it('surfaces write errors without changing data, and keeps the command stream alive', async () => {
    api.update.mockReturnValueOnce(throwError(() => new Error('Save failed')));
    store.update(tickets[0].id, update);
    expect(await firstValueFrom(store.saveError$)).toBe('Save failed');
    expect(await firstValueFrom(store.tickets$)).toEqual(tickets);
    expect(await firstValueFrom(store.saving$)).toBe(false);
    store.update(tickets[0].id, update);
    expect(await firstValueFrom(store.saveError$)).toBeNull();
    expect((await firstValueFrom(store.tickets$))[0].status).toBe('Resolved');
  });

  it('selects a created ticket and resets the creation form only after success', async () => {
    api.create.mockReturnValueOnce(throwError(() => new Error('Offline')));
    store.create(draft);
    expect(await firstValueFrom(store.createVersion$)).toBe(0);
    store.create(draft);
    expect(await firstValueFrom(store.createVersion$)).toBe(1);
    expect((await firstValueFrom(store.selectedTicket$))?.id).toBe(created.id);
    expect(await firstValueFrom(store.tickets$)).toHaveLength(13);
  });

  it('does not allow a write to race an in-flight refresh', () => {
    api.list.mockReturnValue(new Subject());
    store.reload();
    store.create(draft);
    store.update(tickets[0].id, update);
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });
});
