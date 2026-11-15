import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TicketSummary } from '../core/ticket.model';

@Component({
  selector: 'app-queue-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="summary-grid" aria-label="Whole queue summary">
      <article class="metric">
        <span>Active tickets</span><strong>{{ summary.active }}</strong
        ><small>Across all customers</small>
      </article>
      <article class="metric">
        <span>Unassigned</span><strong>{{ summary.unassigned }}</strong
        ><small>Ready for a teammate</small>
      </article>
      <article class="metric metric-alert">
        <span>Overdue</span><strong>{{ summary.overdue }}</strong
        ><small>Past the SLA deadline</small>
      </article>
      <article class="metric">
        <span>Resolved</span><strong>{{ summary.resolved }}</strong
        ><small>Out of {{ summary.total }} tickets</small>
      </article>
    </section>
  `,
})
export class QueueSummaryComponent {
  @Input({ required: true }) summary!: TicketSummary;
}
