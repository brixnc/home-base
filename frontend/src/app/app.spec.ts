import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
  loadCurrentUser = () => {};
  loadDashboard = () => {};
  updatePresence = () => of({});
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
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
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Good morning, Brian Parker');
  });
});
