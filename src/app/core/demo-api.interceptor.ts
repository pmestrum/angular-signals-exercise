import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { BehaviorSubject, map, timer } from 'rxjs';
import { AGENTS, NewTicket, PRIORITIES, STATUSES, Ticket, TicketUpdate } from './ticket.model';
import { createSeedTickets } from './ticket.seed';

export const DEMO_LATENCY = new InjectionToken<number>('Demo API latency', {
  providedIn: 'root',
  factory: () => 450,
});

function apiError(status: number, message: string): never {
  throw new HttpErrorResponse({ status, error: { message } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function isChoice<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value);
}

function isNewTicket(value: unknown): value is NewTicket {
  return (
    isRecord(value) &&
    isText(value['title'], 120) &&
    isText(value['description'], 2000) &&
    isText(value['customer'], 80) &&
    isText(value['email'], 254) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value['email']) &&
    isChoice(value['priority'], PRIORITIES)
  );
}

function isTicketUpdate(value: unknown): value is TicketUpdate {
  return (
    isRecord(value) &&
    isChoice(value['status'], STATUSES) &&
    isChoice(value['priority'], PRIORITIES) &&
    isChoice(value['assignee'], AGENTS) &&
    typeof value['note'] === 'string' &&
    value['note'].length <= 1000
  );
}

@Injectable({ providedIn: 'root' })
export class DemoBackend {
  private tickets = createSeedTickets();
  private nextId = 1053;
  private readonly offlineSubject = new BehaviorSubject(false);
  readonly offline$ = this.offlineSubject.asObservable();

  toggleOffline(): void {
    this.offlineSubject.next(!this.offlineSubject.value);
  }

  respond(request: HttpRequest<unknown>): HttpResponse<unknown> {
    if (this.offlineSubject.value) {
      apiError(503, 'The demo API is offline. Restore the connection and try again.');
    }
    if (request.method === 'GET' && request.url === '/api/tickets') {
      return new HttpResponse({ body: structuredClone(this.tickets) });
    }
    if (request.method === 'POST' && request.url === '/api/tickets') {
      const body = request.body;
      if (!isNewTicket(body)) {
        apiError(400, 'Enter a title, description, customer, valid email, and priority.');
      }
      const now = Date.now();
      const hours = { Low: 72, Medium: 24, High: 8, Urgent: 2 }[body.priority];
      const ticket: Ticket = {
        title: body.title.trim(),
        description: body.description.trim(),
        customer: body.customer.trim(),
        email: body.email.trim(),
        priority: body.priority,
        id: `NS-${this.nextId++}`,
        status: 'Open',
        assignee: 'Unassigned',
        createdAt: new Date(now).toISOString(),
        dueAt: new Date(now + hours * 3_600_000).toISOString(),
        activity: [
          {
            id: crypto.randomUUID(),
            message: 'Ticket created by the service desk.',
            createdAt: new Date(now).toISOString(),
          },
        ],
      };
      this.tickets = [ticket, ...this.tickets];
      return new HttpResponse({ status: 201, body: structuredClone(ticket) });
    }
    if (request.method === 'PATCH' && /^\/api\/tickets\/NS-\d+$/.test(request.url)) {
      const ticket = this.tickets.find((item) => item.id === request.url.split('/').pop());
      if (!ticket) {
        apiError(404, 'This ticket no longer exists.');
      }
      const body = request.body;
      if (!isTicketUpdate(body)) {
        apiError(400, 'Invalid ticket update. Notes must be at most 1,000 characters.');
      }
      const changes: string[] = [];
      if (body.status !== ticket.status) {
        changes.push(`Status: ${ticket.status} -> ${body.status}.`);
      }
      if (body.priority !== ticket.priority) {
        changes.push(`Priority: ${ticket.priority} -> ${body.priority}.`);
      }
      if (body.assignee !== ticket.assignee) {
        changes.push(`Assigned to ${body.assignee}.`);
      }
      if (body.note.trim()) {
        changes.push(body.note.trim());
      }
      if (!changes.length) {
        apiError(400, 'Change a field or add a note before saving.');
      }
      const updated: Ticket = {
        ...ticket,
        status: body.status,
        priority: body.priority,
        assignee: body.assignee,
        activity: [
          {
            id: crypto.randomUUID(),
            message: changes.join(' '),
            createdAt: new Date().toISOString(),
          },
          ...ticket.activity,
        ],
      };
      this.tickets = this.tickets.map((item) => (item.id === updated.id ? updated : item));
      return new HttpResponse({ body: structuredClone(updated) });
    }
    return apiError(404, 'Unknown demo API endpoint.');
  }
}

export const demoApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }
  const backend = inject(DemoBackend);
  // A cancelled subscription must not commit a delayed write.
  return timer(inject(DEMO_LATENCY)).pipe(map(() => backend.respond(request)));
};
