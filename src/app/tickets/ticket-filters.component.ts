import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AGENTS, DEFAULT_FILTERS, PRIORITIES, STATUSES, TicketFilters } from '../core/ticket.model';

@Component({
  selector: 'app-ticket-filters',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filters">
      <label class="search-field"
        >Search tickets
        <input
          type="search"
          placeholder="Search title, customer, or ticket ID"
          [ngModel]="filters.query"
          (ngModelChange)="change({ query: $event })"
        />
      </label>
      <label
        >Status
        <select [ngModel]="filters.status" (ngModelChange)="change({ status: $event })">
          <option value="All">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ status }}</option>
          }
        </select>
      </label>
      <label
        >Priority
        <select [ngModel]="filters.priority" (ngModelChange)="change({ priority: $event })">
          <option value="All">All priorities</option>
          @for (priority of priorities; track priority) {
            <option [value]="priority">{{ priority }}</option>
          }
        </select>
      </label>
      <label
        >Assignee
        <select [ngModel]="filters.assignee" (ngModelChange)="change({ assignee: $event })">
          <option value="All">Everyone</option>
          @for (agent of agents; track agent) {
            <option [value]="agent">{{ agent }}</option>
          }
        </select>
      </label>
      <label
        >Sort by
        <select [ngModel]="filters.sort" (ngModelChange)="change({ sort: $event })">
          <option value="due">SLA deadline</option>
          <option value="priority">Priority</option>
          <option value="newest">Newest first</option>
        </select>
      </label>
      <button type="button" class="text-button filter-reset" (click)="reset()">
        Reset filters
      </button>
    </div>
  `,
})
export class TicketFiltersComponent {
  @Input({ required: true }) filters!: TicketFilters;
  @Output() readonly filtersChange = new EventEmitter<TicketFilters>();
  readonly statuses = STATUSES;
  readonly priorities = PRIORITIES;
  readonly agents = AGENTS;

  change(patch: Partial<TicketFilters>): void {
    this.filtersChange.emit({ ...this.filters, ...patch });
  }

  reset(): void {
    this.filtersChange.emit({ ...DEFAULT_FILTERS });
  }
}
