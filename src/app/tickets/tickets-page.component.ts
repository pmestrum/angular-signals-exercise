import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DemoBackend } from '../core/demo-api.interceptor';
import { CreateTicketComponent } from './create-ticket.component';
import { QueueSummaryComponent } from './queue-summary.component';
import { TicketDetailComponent } from './ticket-detail.component';
import { TicketFiltersComponent } from './ticket-filters.component';
import { TicketListComponent } from './ticket-list.component';
import { TicketStore } from './ticket-store.service';

@Component({
  selector: 'app-tickets-page',
  imports: [
    AsyncPipe,
    CreateTicketComponent,
    QueueSummaryComponent,
    TicketDetailComponent,
    TicketFiltersComponent,
    TicketListComponent,
  ],
  providers: [TicketStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tickets-page.component.html',
})
export class TicketsPageComponent {
  readonly store = inject(TicketStore);
  readonly demo = inject(DemoBackend);
}
