import { Component } from '@angular/core';
import { RouterLink, Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { DashboardComponent } from './dashboard.component';

@Component({
  template: `
    <main class="route-shell not-found">
      <p class="eyebrow">HOMEBASE</p>
      <h1>Page not found</h1>
      <p class="route-copy">The page you requested does not exist or is no longer available.</p>
      <a class="text-button" routerLink="/dashboard">Back to dashboard <span>→</span></a>
    </main>
  `,
  styles: `
    .not-found {
      max-width: 720px;
      margin: 24px auto;
      padding: 0 5% 48px;
      color: #293530;
    }
    .eyebrow {
      color: #78847d;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
    h1 {
      margin: 8px 0;
      font: 600 34px 'Space Grotesk', sans-serif;
    }
    .route-copy {
      color: #78847d;
    }
    .text-button {
      color: #dd7959;
      text-decoration: none;
      font-weight: 600;
    }
  `,
  imports: [RouterLink],
})
class NotFoundComponent {}

export const routes: Routes = [
  {
    path: 'dashboard',
    title: 'Home · homebase',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: 'calendar',
    title: 'Calendar · homebase',
    loadComponent: () => import('./household-pages.component').then((m) => m.CalendarComponent),
    canActivate: [authGuard],
  },
  {
    path: 'chores',
    title: 'Chores · homebase',
    loadComponent: () => import('./chores.component').then((m) => m.ChoresComponent),
    canActivate: [authGuard],
  },
  {
    path: 'shopping',
    title: 'Shopping · homebase',
    loadComponent: () => import('./household-pages.component').then((m) => m.ShoppingComponent),
    canActivate: [authGuard],
  },
  {
    path: 'roommates',
    title: 'Roommates · homebase',
    loadComponent: () => import('./household-pages.component').then((m) => m.RoommatesComponent),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    title: 'Settings · homebase',
    loadComponent: () => import('./household-pages.component').then((m) => m.SettingsComponent),
    canActivate: [authGuard],
  },
  // `/apartment` is the natural name for the settings screen; keep both working.
  { path: 'apartment', pathMatch: 'full', redirectTo: 'settings' },
  {
    path: 'feed',
    title: 'Feed · homebase',
    loadComponent: () => import('./household-pages.component').then((m) => m.FeedComponent),
    canActivate: [authGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '**',
    title: 'Page not found · homebase',
    component: NotFoundComponent,
    canActivate: [authGuard],
  },
];
