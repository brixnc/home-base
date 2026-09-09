import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads the dashboard state', () => {
    service.loadDashboard();

    const request = httpMock.expectOne('http://localhost:8082/api/dashboard');
    expect(service.loading()).toBe(true);
    request.flush({ roommates: [], events: [], chores: [], shopping: [], notifications: [] });

    expect(service.loading()).toBe(false);
    expect(service.dashboard()?.roommates).toEqual([]);
  });

  it('refreshes dashboard after creating a chore', () => {
    service.createChore({ title: 'Trash', priority: 'HIGH' }).subscribe();

    httpMock.expectOne('http://localhost:8082/api/chores').flush({
      id: '1',
      title: 'Trash',
      priority: 'HIGH',
      completed: false,
    });
    httpMock.expectOne('http://localhost:8082/api/dashboard').flush({
      roommates: [],
      events: [],
      chores: [],
      shopping: [],
      notifications: [],
    });
  });

  it('refreshes dashboard and current user after updating presence', () => {
    service.updatePresence({ status: 'HOME' }).subscribe();

    httpMock.expectOne('http://localhost:8082/api/presence/me').flush({
      userId: '1',
      status: 'HOME',
    });
    httpMock.expectOne('http://localhost:8082/api/dashboard').flush({
      roommates: [],
      events: [],
      chores: [],
      shopping: [],
      notifications: [],
    });
    httpMock.expectOne('http://localhost:8082/api/users/me').flush({
      id: '1',
      displayName: 'Brian Parker',
      status: 'HOME',
    });
  });
});
