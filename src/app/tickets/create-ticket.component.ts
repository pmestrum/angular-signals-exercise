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
import { NewTicket, PRIORITIES, TicketPriority } from '../core/ticket.model';

@Component({
  selector: 'app-create-ticket',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-ticket.component.html',
})
export class CreateTicketComponent implements OnChanges {
  @Input() saving = false;
  @Input() disabled = false;
  @Input() resetVersion = 0;
  @Output() readonly created = new EventEmitter<NewTicket>();
  readonly priorities = PRIORITIES;
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(120)]],
    customer: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        Validators.maxLength(254),
      ],
    ],
    description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(2000)]],
    priority: this.fb.control<TicketPriority>('Medium'),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetVersion'] && !changes['resetVersion'].firstChange) {
      this.form.reset();
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.valid && !this.saving && !this.disabled) {
      this.created.emit(this.form.getRawValue());
    }
  }
}
