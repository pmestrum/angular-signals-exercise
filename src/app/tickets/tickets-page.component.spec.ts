import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { DEMO_LATENCY, demoApiInterceptor } from '../core/demo-api.interceptor';
import { TicketDetailComponent } from './ticket-detail.component';
import { TicketsPageComponent } from './tickets-page.component';
import { By } from '@angular/platform-browser';

describe('Zoneless service desk integration', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TicketsPageComponent],
      providers: [
        provideHttpClient(withInterceptors([demoApiInterceptor])),
        { provide: DEMO_LATENCY, useValue: 0 },
      ],
    });
  });

  it('renders HTTP data via AsyncPipe, selects a ticket, and saves through a child output', async () => {
    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    const store = fixture.componentInstance.store;
    await firstValueFrom(store.vm$.pipe(filter((vm) => !vm.loading)));
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('tbody tr')).toHaveLength(12);
    expect(element.querySelector('h1')?.textContent).toContain('clarity');

    element.querySelector<HTMLButtonElement>('.ticket-link')!.click();
    await fixture.whenStable();
    const detail: TicketDetailComponent = fixture.debugElement.query(
      By.directive(TicketDetailComponent),
    ).componentInstance;
    detail.form.controls.note.setValue('Integration exercise complete.');
    detail.submit();
    await firstValueFrom(store.saving$.pipe(filter((saving) => !saving)));
    await fixture.whenStable();
    expect(element.querySelector('.activity-list')?.textContent).toContain(
      'Integration exercise complete.',
    );
    expect(element.querySelector('.success')?.textContent).toContain('updated successfully');
  });

  it('keeps a failed-save draft and successfully retries it after an outage', async () => {
    const fixture = TestBed.createComponent(TicketsPageComponent);
    fixture.detectChanges();
    const { store, demo } = fixture.componentInstance;
    await firstValueFrom(store.vm$.pipe(filter((vm) => !vm.loading)));
    store.select('NS-1041');
    await fixture.whenStable();
    const detail: TicketDetailComponent = fixture.debugElement.query(
      By.directive(TicketDetailComponent),
    ).componentInstance;
    detail.form.controls.note.setValue('Do not lose this note.');
    demo.toggleOffline();
    detail.submit();
    await firstValueFrom(store.saving$.pipe(filter((saving) => !saving)));
    await fixture.whenStable();
    expect(detail.form.controls.note.value).toBe('Do not lose this note.');
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('offline');
    demo.toggleOffline();
    detail.submit();
    await firstValueFrom(store.saving$.pipe(filter((saving) => !saving)));
    await fixture.whenStable();
    expect(detail.form.controls.note.value).toBe('');
    expect(element.querySelector('.activity-list')?.textContent).toContain(
      'Do not lose this note.',
    );
  });
});
