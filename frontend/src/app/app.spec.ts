import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { AuthService } from './auth.service';
import { DashboardService } from './dashboard.service';

class AuthServiceStub {
  init = async () => true;
  logout = async () => {};
  syncUserFromToken = () => {};
}

class DashboardServiceStub {
  readonly dashboard = () => null;
  readonly currentUser = () => ({ displayName: 'Brian Parker' });
  readonly loading = () => false;
  readonly error = () => null;
  loadCurrentUser = () => {};
  loadDashboard = () => {};
  updatePresence = () => of({});
}

describe('App', () => {
  beforeEach(async () => {
    @Component({ template: '' })
    class StubRouteComponent {}

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: 'dashboard', component: StubRouteComponent }]),
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: DashboardService, useClass: DashboardServiceStub },
      ],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the dashboard welcome message', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Good morning, Brian Parker');
  });
});
