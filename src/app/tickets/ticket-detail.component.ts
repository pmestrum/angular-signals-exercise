import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AGENTS,
  Agent,
  PRIORITIES,
  STATUSES,
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketUpdate,
} from '../core/ticket.model';

@Component({
  selector: 'app-ticket-detail',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-detail.component.html',
})
export class TicketDetailComponent implements OnChanges {
  @Input({ required: true }) ticket!: Ticket;
  @Input() saving = false;
  @Input() disabled = false;
  @Output() readonly saved = new EventEmitter<TicketUpdate>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly statuses = STATUSES;
  readonly priorities = PRIORITIES;
  readonly agents = AGENTS;
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    status: this.fb.control<TicketStatus>('Open'),
    priority: this.fb.control<TicketPriority>('Medium'),
    assignee: this.fb.control<Agent>('Unassigned'),
    note: ['', Validators.maxLength(1000)],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticket']) {
      this.form.reset({
        status: this.ticket.status,
        priority: this.ticket.priority,
        assignee: this.ticket.assignee,
        note: '',
      });
    }
  }

  get hasChanges(): boolean {
    const value = this.form.getRawValue();
    return (
      value.status !== this.ticket.status ||
      value.priority !== this.ticket.priority ||
      value.assignee !== this.ticket.assignee ||
      value.note.trim().length > 0
    );
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.valid && this.hasChanges && !this.saving && !this.disabled) {
      this.saved.emit(this.form.getRawValue());
    }
  }
}
