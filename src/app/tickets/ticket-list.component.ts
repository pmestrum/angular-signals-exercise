import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Ticket } from '../core/ticket.model';

@Component({
  selector: 'app-ticket-list',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-scroll">
      <table>
        <caption class="sr-only">
          Customer tickets. Select a ticket to view and edit it.
        </caption>
        <thead>
          <tr>
            <th scope="col">Ticket / customer</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Owner / SLA</th>
          </tr>
        </thead>
        <tbody>
          @for (ticket of tickets; track ticket.id) {
            <tr [class.selected-row]="ticket.id === selectedId">
              <td>
                <span class="ticket-id"
                  >{{ ticket.id }} <span class="customer">{{ ticket.customer }}</span></span
                >
                <button
                  type="button"
                  class="ticket-link"
                  [disabled]="disabled"
                  [attr.aria-pressed]="ticket.id === selectedId"
                  (click)="ticketSelected.emit(ticket.id)"
                >
                  {{ ticket.title }}
                </button>
              </td>
              <td>
                <span class="badge" [attr.data-status]="ticket.status">{{ ticket.status }}</span>
              </td>
              <td>
                <span class="priority" [attr.data-priority]="ticket.priority">{{
                  ticket.priority
                }}</span>
              </td>
              <td>
                <span class="owner">{{ ticket.assignee }}</span>
                @if (ticket.status === 'Resolved') {
                  <small class="muted">Completed</small>
                } @else {
                  <small [class.overdue]="isOverdue(ticket)">
                    {{ isOverdue(ticket) ? 'Overdue' : 'Due' }}
                    {{ ticket.dueAt | date: 'MMM d, HH:mm' }}
                  </small>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="empty-state">
                <strong>No matching tickets</strong>
                <p>Try another search or reset your filters.</p>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TicketListComponent {
  @Input({ required: true }) tickets: readonly Ticket[] = [];
  @Input() selectedId: string | null = null;
  @Input() disabled = false;
  @Input({ required: true }) now = 0;
  @Output() readonly ticketSelected = new EventEmitter<string>();

  isOverdue(ticket: Ticket): boolean {
    return ticket.status !== 'Resolved' && Date.parse(ticket.dueAt) < this.now;
  }
}
