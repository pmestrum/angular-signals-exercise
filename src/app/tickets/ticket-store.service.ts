import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  defer,
  distinctUntilChanged,
  exhaustMap,
  finalize,
  map,
  shareReplay,
  startWith,
  switchMap,
  timer,
} from 'rxjs';
import { TicketApiService } from '../core/ticket-api.service';
import {
  DEFAULT_FILTERS,
  NewTicket,
  Ticket,
  TicketFilters,
  TicketUpdate,
  filterTickets,
  summarizeTickets,
} from '../core/ticket.model';

type Command =
  | { readonly kind: 'create'; readonly ticket: NewTicket }
  | { readonly kind: 'update'; readonly id: string; readonly update: TicketUpdate };

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }
    return `Request failed (${error.status || 'network error'}). Please try again.`;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
}

@Injectable()
export class TicketStore {
  private readonly api = inject(TicketApiService);
  private readonly ticketsSubject = new BehaviorSubject<readonly Ticket[]>([]);
  private readonly filtersSubject = new BehaviorSubject<TicketFilters>({ ...DEFAULT_FILTERS });
  private readonly selectedIdSubject = new BehaviorSubject<string | null>(null);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly savingSubject = new BehaviorSubject(false);
  private readonly loadErrorSubject = new BehaviorSubject<string | null>(null);
  private readonly saveErrorSubject = new BehaviorSubject<string | null>(null);
  private readonly noticeSubject = new BehaviorSubject<string | null>(null);
  private readonly createVersionSubject = new BehaviorSubject(0);
  private readonly refreshSubject = new Subject<void>();
  private readonly commandsSubject = new Subject<Command>();

  readonly tickets$ = this.ticketsSubject.asObservable();
  readonly filters$ = this.filtersSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly saving$ = this.savingSubject.asObservable();
  readonly loadError$ = this.loadErrorSubject.asObservable();
  readonly saveError$ = this.saveErrorSubject.asObservable();
  readonly notice$ = this.noticeSubject.asObservable();
  readonly createVersion$ = this.createVersionSubject.asObservable();
  readonly now$ = timer(0, 60_000).pipe(
    map(() => Date.now()),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly search$ = this.filters$.pipe(
    map((filters) => filters.query),
    distinctUntilChanged(),
    debounceTime(250),
    startWith(''),
  );

  readonly visibleTickets$ = combineLatest([this.tickets$, this.filters$, this.search$]).pipe(
    map(([tickets, filters, query]) => filterTickets(tickets, { ...filters, query })),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly summary$ = combineLatest([this.tickets$, this.now$]).pipe(
    map(([tickets, now]) => summarizeTickets(tickets, now)),
  );

  readonly selectedTicket$ = combineLatest([this.tickets$, this.selectedIdSubject]).pipe(
    map(([tickets, id]) => tickets.find((ticket) => ticket.id === id) ?? null),
    distinctUntilChanged(),
  );

  readonly vm$ = combineLatest({
    tickets: this.visibleTickets$,
    filters: this.filters$,
    summary: this.summary$,
    selected: this.selectedTicket$,
    loading: this.loading$,
    saving: this.saving$,
    loadError: this.loadError$,
    saveError: this.saveError$,
    notice: this.notice$,
    now: this.now$,
    createVersion: this.createVersion$,
  });

  constructor() {
    this.refreshSubject
      .pipe(
        startWith(undefined),
        switchMap(() =>
          defer(() => {
            this.loadingSubject.next(true);
            this.loadErrorSubject.next(null);
            return this.api.list().pipe(
              catchError((error: unknown) => {
                this.loadErrorSubject.next(errorMessage(error));
                return EMPTY;
              }),
              finalize(() => this.loadingSubject.next(false)),
            );
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((tickets) => this.ticketsSubject.next(tickets));

    this.commandsSubject
      .pipe(
        // Ignore duplicate submissions while a write is in flight.
        exhaustMap((command) =>
          defer(() => {
            this.savingSubject.next(true);
            this.saveErrorSubject.next(null);
            this.noticeSubject.next(null);
            const request$ =
              command.kind === 'create'
                ? this.api.create(command.ticket)
                : this.api.update(command.id, command.update);
            return request$.pipe(
              map((ticket) => ({ ticket, kind: command.kind })),
              catchError((error: unknown) => {
                this.saveErrorSubject.next(errorMessage(error));
                return EMPTY;
              }),
              finalize(() => this.savingSubject.next(false)),
            );
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ ticket, kind }) => {
        const tickets = this.ticketsSubject.value;
        this.ticketsSubject.next(
          kind === 'create'
            ? [ticket, ...tickets]
            : tickets.map((item) => (item.id === ticket.id ? ticket : item)),
        );
        this.selectedIdSubject.next(ticket.id);
        this.noticeSubject.next(
          `${ticket.id} ${kind === 'create' ? 'created' : 'updated'} successfully.`,
        );
        if (kind === 'create') {
          this.createVersionSubject.next(this.createVersionSubject.value + 1);
        }
      });
  }

  setFilters(filters: TicketFilters): void {
    this.filtersSubject.next(filters);
  }

  select(id: string | null): void {
    if (!this.savingSubject.value) {
      this.selectedIdSubject.next(id);
      this.saveErrorSubject.next(null);
      this.noticeSubject.next(null);
    }
  }

  reload(): void {
    if (!this.savingSubject.value) {
      this.refreshSubject.next();
    }
  }

  create(ticket: NewTicket): void {
    if (!this.loadingSubject.value) {
      this.commandsSubject.next({ kind: 'create', ticket });
    }
  }

  update(id: string, update: TicketUpdate): void {
    if (!this.loadingSubject.value) {
      this.commandsSubject.next({ kind: 'update', id, update });
    }
  }
}
