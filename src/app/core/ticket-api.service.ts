import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NewTicket, Ticket, TicketUpdate } from './ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<readonly Ticket[]> {
    return this.http.get<readonly Ticket[]>('/api/tickets');
  }

  create(ticket: NewTicket): Observable<Ticket> {
    return this.http.post<Ticket>('/api/tickets', ticket);
  }

  update(id: string, update: TicketUpdate): Observable<Ticket> {
    return this.http.patch<Ticket>(`/api/tickets/${encodeURIComponent(id)}`, update);
  }
}
