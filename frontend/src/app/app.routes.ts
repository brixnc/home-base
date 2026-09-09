import { Component } from '@angular/core';
import { RouterLink, Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { ChoresComponent } from './chores.component';
import {
  CalendarComponent,
  FeedComponent,
  RoommatesComponent,
  SettingsComponent,
  ShoppingComponent,
} from './household-pages.component';

@Component({
  template: `
    <main class="route-shell">
      <div class="route-banner">
        <p class="eyebrow">HOMEBASE</p>
        <h1>Simple apartment navigation</h1>
      </div>
      <p class="route-copy">This section is ready for the next room-specific detail view.</p>
      <a class="text-button" routerLink="/dashboard">Back to dashboard <span>→</span></a>
    </main>
  `,
  imports: [RouterLink],
})
class EmptyPageComponent {}

@Component({
  template: '',
})
class DashboardRouteComponent {}

export const routes: Routes = [
  {
    path: 'dashboard',
    title: 'Home · homebase',
    component: DashboardRouteComponent,
    canActivate: [authGuard],
  },
  {
    path: 'calendar',
    title: 'Calendar · homebase',
    component: CalendarComponent,
    canActivate: [authGuard],
  },
  {
    path: 'chores',
    title: 'Chores · homebase',
    component: ChoresComponent,
    canActivate: [authGuard],
  },
  {
    path: 'shopping',
    title: 'Shopping · homebase',
    component: ShoppingComponent,
    canActivate: [authGuard],
  },
  {
    path: 'roommates',
    title: 'Roommates · homebase',
    component: RoommatesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    title: 'Settings · homebase',
    component: SettingsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'feed',
    title: 'Feed · homebase',
    component: FeedComponent,
    canActivate: [authGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];
