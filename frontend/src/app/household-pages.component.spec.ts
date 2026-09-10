import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CalendarComponent,
  SettingsComponent,
  ShoppingComponent,
} from './household-pages.component';
import { DashboardService } from './dashboard.service';

const API = 'http://localhost:8082/api';

function configure(component: unknown) {
  // Three component suites share this file, so start from a clean module.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [component as never],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      DashboardService,
    ],
  });
  return TestBed.inject(HttpTestingController);
}

describe('SettingsComponent Wi-Fi password handling', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;

  beforeEach(() => {
    http = configure(SettingsComponent);
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // The apartment GET must never carry the plaintext password.
    http.expectOne(`${API}/apartment`).flush({
      id: 'apt-1',
      name: 'vog69',
      address: 'Vogesenstrasse 69',
      wifiName: 'vog69',
      hasWifiPassword: true,
      landlordContact: null,
      emergencyContact: null,
      sharedNotes: null,
    });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('does not receive the stored password from the apartment GET', () => {
    expect(component.apartment.hasWifiPassword).toBe(true);
    expect((component.apartment as unknown as Record<string, unknown>)['wifiPassword']).toBeUndefined();
  });

  // The original bug: saving any other field sent an empty wifiPassword and
  // nulled the stored one.
  it('omits wifiPassword entirely when only other fields change', () => {
    component.apartment.name = 'New apartment name';
    component.save();

    const request = http.expectOne(`${API}/apartment`);
    expect(request.request.method).toBe('PUT');
    expect('wifiPassword' in request.request.body).toBe(false);
    expect(request.request.body.name).toBe('New apartment name');
    request.flush({ name: 'New apartment name', hasWifiPassword: true });
    http.expectOne(`${API}/dashboard`).flush({});
  });

  it('revealing then hiding the password never changes what is saved', () => {
    component.toggleWifiPassword();
    http.expectOne(`${API}/apartment/password`).flush({
      hasWifiPassword: true,
      wifiPassword: 'homebase123',
    });
    expect(component.showWifiPassword()).toBe(true);
    expect(component.wifiPasswordInput()).toBe('homebase123');

    component.toggleWifiPassword();
    expect(component.showWifiPassword()).toBe(false);

    component.save();
    const request = http.expectOne(`${API}/apartment`);
    expect('wifiPassword' in request.request.body).toBe(false);
    request.flush({ name: 'vog69', hasWifiPassword: true });
    http.expectOne(`${API}/dashboard`).flush({});
  });

  it('sends the new password when the user actually edits the field', () => {
    component.onWifiPasswordInput('a-brand-new-password');
    component.save();

    const request = http.expectOne(`${API}/apartment`);
    expect(request.request.body.wifiPassword).toBe('a-brand-new-password');
    request.flush({ name: 'vog69', hasWifiPassword: true });
    http.expectOne(`${API}/dashboard`).flush({});
  });

  it('sends an explicit empty string only when the user asks to remove it', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.removeWifiPassword();
    expect(component.removingWifiPassword()).toBe(true);

    component.save();
    const request = http.expectOne(`${API}/apartment`);
    expect(request.request.body.wifiPassword).toBe('');
    request.flush({ name: 'vog69', hasWifiPassword: false });
    http.expectOne(`${API}/dashboard`).flush({});
    confirmSpy.mockRestore();
  });

  it('does not stage a removal when the confirmation is dismissed', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.removeWifiPassword();
    expect(component.removingWifiPassword()).toBe(false);

    component.save();
    const request = http.expectOne(`${API}/apartment`);
    expect('wifiPassword' in request.request.body).toBe(false);
    request.flush({ name: 'vog69', hasWifiPassword: true });
    http.expectOne(`${API}/dashboard`).flush({});
    confirmSpy.mockRestore();
  });
});

describe('CalendarComponent month view', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<CalendarComponent>;
  let component: CalendarComponent;

  beforeEach(() => {
    http = configure(CalendarComponent);
    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${API}/users/me`).flush({ id: 'user-1', displayName: 'Brian Parker' });
    http.expectOne(`${API}/events`).flush([
      {
        id: 'e1',
        title: 'Flat dinner',
        date: '2026-09-11',
        startTime: '2026-09-11T19:00',
        creatorId: 'user-1',
        creatorName: 'Brian Parker',
        assigneeId: 'user-2',
        assigneeName: 'Alex Morgan',
        past: false,
      },
      {
        id: 'e2',
        title: 'Inspection',
        date: '2026-09-11',
        startTime: '2026-09-11T09:00',
        creatorId: 'user-2',
        creatorName: 'Alex Morgan',
        past: false,
      },
      {
        id: 'e3',
        title: 'Rent due',
        date: '2026-09-30',
        startTime: '2026-09-30T08:00',
        creatorId: 'user-1',
        creatorName: 'Brian Parker',
        past: false,
      },
    ]);
    http.expectOne(`${API}/presence`).flush([
      { userId: 'user-1', name: 'Brian Parker', status: 'HOME', isCurrentUser: true },
      { userId: 'user-2', name: 'Alex Morgan', status: 'AT_WORK', isCurrentUser: false },
    ]);

    component.monthCursor.set(new Date(2026, 8, 1)); // September 2026
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('places each event on its own calendar date', () => {
    const days = component.calendarWeeks().flat();
    const sept11 = days.find((day) => day.key === '2026-09-11');
    const sept30 = days.find((day) => day.key === '2026-09-30');
    const sept12 = days.find((day) => day.key === '2026-09-12');

    expect(sept11?.events.map((event) => event.title)).toEqual(['Inspection', 'Flat dinner']);
    expect(sept30?.events.map((event) => event.title)).toEqual(['Rent due']);
    expect(sept12?.events).toEqual([]);
  });

  it('builds a Monday-first grid and marks days outside the month', () => {
    const weeks = component.calendarWeeks();
    expect(weeks[0].length).toBe(7);
    // 1 September 2026 is a Tuesday, so the grid starts on 31 August.
    expect(weeks[0][0].key).toBe('2026-08-31');
    expect(weeks[0][0].inCurrentMonth).toBe(false);
    expect(weeks[0][1].key).toBe('2026-09-01');
    expect(weeks[0][1].inCurrentMonth).toBe(true);
  });

  it('navigates months and keeps the label in sync', () => {
    expect(component.monthLabel()).toContain('2026');
    component.nextMonth();
    expect(component.monthCursor().getMonth()).toBe(9); // October
    component.previousMonth();
    expect(component.monthCursor().getMonth()).toBe(8);
  });

  it('exposes the selected day’s events with their assignee', () => {
    component.selectDay('2026-09-11');
    fixture.detectChanges();
    expect(component.selectedDayEvents().length).toBe(2);

    const rendered = (fixture.nativeElement as HTMLElement).querySelector(
      '.calendar-selection',
    ) as HTMLElement;
    expect(rendered.textContent).toContain('Flat dinner');
    expect(rendered.textContent).toContain('Assigned to Alex Morgan');
  });

  it('keeps the existing list view available through the toggle', () => {
    component.viewMode.set('LIST');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.calendar')).toBeFalsy();
    expect(el.querySelector('section.list')).toBeTruthy();
    expect(el.querySelector('section.list')?.textContent).toContain('Flat dinner');
  });

  it('persists the chosen assignee when creating an event', () => {
    component.title = 'Movie night';
    component.startTime = '2026-09-15T20:00';
    component.assigneeId = 'user-2';
    component.create();

    const request = http.expectOne(`${API}/events`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.assigneeId).toBe('user-2');
    request.flush({
      id: 'e4',
      title: 'Movie night',
      date: '2026-09-15',
      startTime: '2026-09-15T20:00',
      creatorId: 'user-1',
      creatorName: 'Brian Parker',
      assigneeId: 'user-2',
      assigneeName: 'Alex Morgan',
    });

    // createEvent refreshes shared dashboard state and reloads the list.
    http.expectOne(`${API}/dashboard`).flush({});
    http.expectOne(`${API}/events`).flush([]);
  });
});

describe('ShoppingComponent assignment', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ShoppingComponent>;
  let component: ShoppingComponent;

  beforeEach(() => {
    http = configure(ShoppingComponent);
    fixture = TestBed.createComponent(ShoppingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne(`${API}/shopping`).flush([
      {
        id: 's1',
        name: 'Milk',
        quantity: '2L',
        category: 'FOOD',
        purchased: false,
        addedById: 'user-1',
        addedByName: 'Brian Parker',
        assigneeId: 'user-2',
        assigneeName: 'Alex Morgan',
      },
    ]);
    http.expectOne(`${API}/presence`).flush([
      { userId: 'user-1', name: 'Brian Parker', status: 'HOME', isCurrentUser: true },
      { userId: 'user-2', name: 'Alex Morgan', status: 'AT_WORK', isCurrentUser: false },
    ]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('displays the assignee alongside the existing added-by attribution', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Added by Brian Parker');
    expect(el.textContent).toContain('Assigned to Alex Morgan');
  });

  it('sends the assignee when creating an item', () => {
    component.name = 'Bin bags';
    component.assigneeId = 'user-2';
    component.create();

    const request = http.expectOne(`${API}/shopping`);
    expect(request.request.body.assigneeId).toBe('user-2');
    request.flush({ id: 's2', name: 'Bin bags', category: 'FOOD', purchased: false });

    http.expectOne(`${API}/dashboard`).flush({});
    http.expectOne(`${API}/shopping`).flush([]);
  });

  it('keeps bought/unbought state working independently of assignment', () => {
    component.toggle({ id: 's1', name: 'Milk', category: 'FOOD', purchased: false } as never);
    const request = http.expectOne(`${API}/shopping/s1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ purchased: true });
    request.flush({ id: 's1', name: 'Milk', category: 'FOOD', purchased: true });
    http.expectOne(`${API}/dashboard`).flush({});
  });
});
