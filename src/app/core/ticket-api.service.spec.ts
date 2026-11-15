import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DEMO_LATENCY, DemoBackend, demoApiInterceptor } from './demo-api.interceptor';
import { TicketApiService } from './ticket-api.service';
import { NewTicket, TicketUpdate } from './ticket.model';

describe('Ticket API and demo HTTP boundary', () => {
  let api: TicketApiService;
  const newTicket: NewTicket = {
    title: 'Cannot access reports',
    description: 'The export button is disabled.',
    customer: 'Example team',
    email: 'help@example.test',
    priority: 'High',
  };
  const update: TicketUpdate = {
    status: 'In progress',
    assignee: 'Jamie Chen',
    priority: 'Urgent',
    note: 'Investigating.',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoApiInterceptor])),
        { provide: DEMO_LATENCY, useValue: 0 },
      ],
    });
    api = TestBed.inject(TicketApiService);
  });

  it('loads seeded tickets and isolates returned data from server storage', async () => {
    const tickets = await firstValueFrom(api.list());
    expect(tickets).toHaveLength(12);
    expect(await firstValueFrom(api.list())).not.toBe(tickets);
  });

  it('creates tickets with unique IDs, default ownership and an SLA deadline', async () => {
    const first = await firstValueFrom(api.create(newTicket));
    const second = await firstValueFrom(api.create(newTicket));
    expect(first.id).not.toBe(second.id);
    expect(first.status).toBe('Open');
    expect(first.assignee).toBe('Unassigned');
    expect(Date.parse(first.dueAt) - Date.parse(first.createdAt)).toBe(8 * 3_600_000);
    expect(await firstValueFrom(api.list())).toHaveLength(14);
  });

  it('persists updates and appends an activity entry without changing the original SLA', async () => {
    const before = (await firstValueFrom(api.list()))[0];
    const result = await firstValueFrom(api.update(before.id, update));
    expect(result.status).toBe('In progress');
    expect(result.assignee).toBe('Jamie Chen');
    expect(result.activity[0].message).toContain('Investigating.');
    expect(result.activity).toHaveLength(2);
    expect(result.dueAt).toBe(before.dueAt);
    expect((await firstValueFrom(api.list()))[0]).toEqual(result);
  });

  it('rejects invalid payloads and unknown tickets explicitly', async () => {
    await expect(firstValueFrom(api.create({ ...newTicket, title: '   ' }))).rejects.toMatchObject({
      status: 400,
    });
    await expect(firstValueFrom(api.update('NS-9999', update))).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      firstValueFrom(
        TestBed.inject(HttpClient).patch('/api/tickets/NS-1041', { status: 'Invalid' }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('keeps data unchanged during an outage and allows retries after reconnecting', async () => {
    const backend = TestBed.inject(DemoBackend);
    backend.toggleOffline();
    await expect(firstValueFrom(api.create(newTicket))).rejects.toMatchObject({ status: 503 });
    backend.toggleOffline();
    expect(await firstValueFrom(api.list())).toHaveLength(12);
    await firstValueFrom(api.create(newTicket));
    expect(await firstValueFrom(api.list())).toHaveLength(13);
  });

  it('does not commit a cancelled write', async () => {
    const subscription = api.create(newTicket).subscribe();
    subscription.unsubscribe();
    expect(await firstValueFrom(api.list())).toHaveLength(12);
  });
});
