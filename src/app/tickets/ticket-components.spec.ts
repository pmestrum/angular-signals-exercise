import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DEFAULT_FILTERS } from '../core/ticket.model';
import { createSeedTickets } from '../core/ticket.seed';
import { CreateTicketComponent } from './create-ticket.component';
import { TicketDetailComponent } from './ticket-detail.component';
import { TicketFiltersComponent } from './ticket-filters.component';
import { TicketListComponent } from './ticket-list.component';

describe('Decorator-based component contracts', () => {
  it('emits a new filter object without mutating its input', () => {
    const fixture = TestBed.createComponent(TicketFiltersComponent);
    const filters = { ...DEFAULT_FILTERS };
    fixture.componentRef.setInput('filters', filters);
    fixture.detectChanges();
    const emit = vi.fn();
    fixture.componentInstance.filtersChange.subscribe(emit);
    fixture.componentInstance.change({ status: 'Waiting' });
    expect(emit).toHaveBeenCalledWith({ ...filters, status: 'Waiting' });
    expect(filters.status).toBe('All');
  });

  it('emits ticket selection from a real button click', () => {
    const fixture = TestBed.createComponent(TicketListComponent);
    const tickets = createSeedTickets();
    fixture.componentRef.setInput('tickets', tickets);
    fixture.componentRef.setInput('now', Date.now());
    fixture.detectChanges();
    const emit = vi.fn();
    fixture.componentInstance.ticketSelected.subscribe(emit);
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.ticket-link')!.click();
    expect(emit).toHaveBeenCalledWith(tickets[0].id);
  });

  it('resets editable draft state when the selected input ticket changes', () => {
    const fixture = TestBed.createComponent(TicketDetailComponent);
    const tickets = createSeedTickets();
    fixture.componentRef.setInput('ticket', tickets[0]);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.note.setValue('Draft for the first ticket');
    fixture.componentRef.setInput('ticket', tickets[1]);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      status: tickets[1].status,
      priority: tickets[1].priority,
      assignee: tickets[1].assignee,
      note: '',
    });
  });

  it('emits a valid update without mutating the ticket or prematurely clearing the draft', () => {
    const fixture = TestBed.createComponent(TicketDetailComponent);
    const ticket = createSeedTickets()[0];
    fixture.componentRef.setInput('ticket', ticket);
    fixture.detectChanges();
    const emit = vi.fn();
    fixture.componentInstance.saved.subscribe(emit);
    fixture.componentInstance.form.patchValue({ status: 'Resolved', note: 'Solved' });
    fixture.componentInstance.submit();
    expect(emit).toHaveBeenCalledWith({
      status: 'Resolved',
      priority: ticket.priority,
      assignee: ticket.assignee,
      note: 'Solved',
    });
    expect(ticket.status).toBe('Open');
    expect(fixture.componentInstance.form.controls.note.value).toBe('Solved');
  });

  it('rejects empty and whitespace-only creation forms', () => {
    const fixture = TestBed.createComponent(CreateTicketComponent);
    const emit = vi.fn();
    fixture.componentInstance.created.subscribe(emit);
    fixture.componentInstance.submit();
    fixture.componentInstance.form.patchValue({
      title: '   ',
      description: 'Valid details',
      customer: 'Test',
      email: 'a@b.test',
    });
    fixture.componentInstance.submit();
    expect(emit).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.touched).toBe(true);
  });

  it('retains a creation draft during a save and clears it only on the success input', () => {
    const fixture = TestBed.createComponent(CreateTicketComponent);
    fixture.componentRef.setInput('resetVersion', 0);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.title.setValue('Keep this draft');
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.title.value).toBe('Keep this draft');
    fixture.componentRef.setInput('resetVersion', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.title.value).toBe('');
  });
});
