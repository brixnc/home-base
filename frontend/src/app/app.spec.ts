import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthService } from './auth.service';
import { DashboardComponent } from './dashboard.component';
import { DashboardResponse, DashboardService } from './dashboard.service';

class AuthServiceStub {
  init = async () => true;
  logout = async () => {};
  refreshToken = async () => true;
  syncUserFromToken = () => {};
  getToken = () => 'token';
}

function dashboardResponse(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    roommates: [],
    events: [],
    chores: [],
    shopping: [],
    notifications: [],
    absences: [],
    unreadNotifications: 0,
    ...overrides,
  };
}

class DashboardServiceStub {
  readonly dashboard = signal<DashboardResponse | null>(dashboardResponse());
  readonly currentUser = signal<Record<string, unknown> | null>({
    id: 'user-1',
    displayName: 'Brian Parker',
    status: 'HOME',
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  loadCurrentUser = () => {};
  loadDashboard = () => {};
  updatePresence = () => of({});
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: 'dashboard', component: DashboardComponent }]),
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: DashboardService, useClass: DashboardServiceStub },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the dashboard on the /dashboard route', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Good morning, Brian Parker');
  });

  // Regression guard: Keycloak returns from login to `/dashboard#state=…&code=…`.
  // The dashboard used to be gated on `currentUrl() === '/dashboard'`, so that
  // fragment made the whole dashboard render blank after every login/refresh.
  it('renders the dashboard when the URL still carries the Keycloak OAuth fragment', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard#state=abc123&session_state=def&code=ghi');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.dashboard')).toBeTruthy();
    expect(compiled.querySelector('h1')?.textContent).toContain('Good morning, Brian Parker');
  });

  it('exposes every destination plus sign-out in the mobile navigation', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const bottomBarRoutes = Array.from(compiled.querySelectorAll('.mobile-nav a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(bottomBarRoutes).toEqual(['/dashboard', '/calendar', '/chores', '/shopping']);

    // The remaining destinations live behind the "More" sheet.
    const moreButton = compiled.querySelector('.mobile-nav-more') as HTMLButtonElement;
    expect(moreButton).toBeTruthy();
    moreButton.click();
    fixture.detectChanges();

    const sheetRoutes = Array.from(compiled.querySelectorAll('.mobile-sheet a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(sheetRoutes).toEqual(['/roommates', '/feed', '/settings']);
    expect(compiled.querySelector('.mobile-sheet-link.sign-out')).toBeTruthy();
  });
});
