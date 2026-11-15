import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./tickets/tickets-page.component').then((m) => m.TicketsPageComponent),
    title: 'Northstar | Service desk',
  },
  { path: '**', redirectTo: '' },
];
