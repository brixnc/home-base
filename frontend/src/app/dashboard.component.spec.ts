import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { DashboardResponse, DashboardService } from './dashboard.service';

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
  updatePresenceCalls: { status: string }[] = [];
  updatePresenceFails = false;
  loadCurrentUser = () => {};
  loadDashboard = () => {};
  updatePresence = (request: { status: string }) => {
    this.updatePresenceCalls.push(request);
    if (this.updatePresenceFails) {
      return throwError(() => ({ error: { error: 'Status is invalid' } }));
    }
    this.currentUser.set({ ...this.currentUser(), status: request.status });
    return of({});
  };
}

function setup() {
  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [provideRouter([]), { provide: DashboardService, useClass: DashboardServiceStub }],
  });
  const service = TestBed.inject(DashboardService) as unknown as DashboardServiceStub;
  const fixture = TestBed.createComponent(DashboardComponent);
  return { fixture, service, el: () => fixture.nativeElement as HTMLElement };
}

describe('DashboardComponent', () => {
  describe('shopping section', () => {
    it('renders unbought items with quantity, category and assignee', () => {
      const { fixture, service, el } = setup();
      service.dashboard.set(
        dashboardResponse({
          outstandingShoppingCount: 2,
          purchasedShoppingCount: 1,
          shopping: [
            { id: 's1', name: 'Milk', quantity: '2L', category: 'FOOD', purchased: false },
            {
              id: 's2',
              name: 'Bin bags',
              category: 'HOUSEHOLD',
              purchased: false,
              assigneeName: 'Alex Morgan',
            },
            { id: 's3', name: 'Soap', category: 'BATHROOM', purchased: true },
          ],
        }),
      );
      fixture.detectChanges();

      const panel = el().querySelector('.shopping-panel') as HTMLElement;
      expect(panel).toBeTruthy();
      expect(panel.textContent).toContain('Milk');
      expect(panel.textContent).toContain('2L');
      expect(panel.textContent).toContain('Food');
      expect(panel.textContent).toContain('Bin bags');
      expect(panel.textContent).toContain('Alex Morgan');
      // Purchased items are not part of "still needed".
      expect(panel.textContent).not.toContain('Soap');
      expect(panel.textContent).toContain('2 needed');
    });

    it('shows an empty state when nothing is on the list', () => {
      const { fixture, el } = setup();
      fixture.detectChanges();
      const panel = el().querySelector('.shopping-panel') as HTMLElement;
      expect(panel.textContent).toContain('Nothing on the shopping list right now.');
    });
  });

  describe('layout order', () => {
    it('places Latest updates last and at full width without breaking data loading', () => {
      const { fixture, service, el } = setup();
      service.dashboard.set(
        dashboardResponse({
          unreadNotifications: 1,
          notifications: [{ id: 'n1', title: 'New assigned chore', message: 'Bins', read: false }],
          shopping: [{ id: 's1', name: 'Milk', category: 'FOOD', purchased: false }],
        }),
      );
      fixture.detectChanges();

      const panels = Array.from(el().querySelectorAll('.dashboard-grid > .panel'));
      const order = panels.map((panel) => panel.className.split(' ').find((c) => c.endsWith('-panel')));
      expect(order).toEqual([
        'presence-panel',
        'event-panel',
        'chores-panel',
        'shopping-panel',
        'away-panel',
        'absence-panel',
        'feed-panel',
      ]);

      // Still bound to real dashboard data once moved to the bottom.
      const feed = el().querySelector('.feed-panel') as HTMLElement;
      expect(feed.textContent).toContain('New assigned chore');
      expect(feed.textContent).toContain('1 unread');
    });
  });

  describe('absences', () => {
    it('lists upcoming absences and flags who is away right now', () => {
      const { fixture, service, el } = setup();
      service.dashboard.set(
        dashboardResponse({
          absences: [
            {
              id: 'a1',
              userId: 'u2',
              userName: 'Sam Lee',
              startsOn: '2026-09-20',
              endsOn: '2026-09-25',
              note: 'Visiting family',
              active: false,
            },
            {
              id: 'a2',
              userId: 'u3',
              userName: 'Alex Morgan',
              startsOn: '2026-09-08',
              endsOn: '2026-09-12',
              active: true,
            },
          ],
        }),
      );
      fixture.detectChanges();

      const panel = el().querySelector('.absence-panel') as HTMLElement;
      expect(panel.textContent).toContain('Sam Lee');
      expect(panel.textContent).toContain('Visiting family');
      expect(panel.textContent).toContain('AWAY NOW');
      expect(panel.querySelectorAll('.absence-card').length).toBe(2);
    });

    it('shows an empty state when nobody is away', () => {
      const { fixture, el } = setup();
      fixture.detectChanges();
      expect((el().querySelector('.absence-panel') as HTMLElement).textContent).toContain(
        'No planned absences',
      );
    });
  });

  describe('status picker', () => {
    it('shows the current status as a readable label', () => {
      const { fixture, service, el } = setup();
      service.currentUser.set({ id: 'user-1', displayName: 'Brian Parker', status: 'AT_WORK' });
      fixture.detectChanges();
      expect((el().querySelector('.status-picker-label') as HTMLElement).textContent?.trim()).toBe(
        'At work',
      );
    });

    it('opens a menu offering every status including DO_NOT_DISTURB', () => {
      const { fixture, el } = setup();
      fixture.detectChanges();
      (el().querySelector('.status-picker .primary-action') as HTMLButtonElement).click();
      fixture.detectChanges();

      const labels = Array.from(el().querySelectorAll('.status-option-label')).map((option) =>
        option.textContent?.trim(),
      );
      expect(labels).toEqual([
        'Home',
        'Away',
        'At work',
        'At school',
        'Traveling',
        'Do not disturb',
      ]);
    });

    it('sends the canonical value and reflects it immediately', () => {
      const { fixture, service, el } = setup();
      fixture.detectChanges();
      (el().querySelector('.status-picker .primary-action') as HTMLButtonElement).click();
      fixture.detectChanges();

      const options = Array.from(
        el().querySelectorAll('.status-option'),
      ) as HTMLButtonElement[];
      options[2].click(); // "At work"
      fixture.detectChanges();

      expect(service.updatePresenceCalls).toEqual([{ status: 'AT_WORK' }]);
      expect((el().querySelector('.status-picker-label') as HTMLElement).textContent?.trim()).toBe(
        'At work',
      );
      // Menu closes after choosing.
      expect(el().querySelector('.status-menu')).toBeFalsy();
    });

    it('surfaces an error and reverts when the update fails', () => {
      const { fixture, service, el } = setup();
      service.updatePresenceFails = true;
      fixture.detectChanges();
      (el().querySelector('.status-picker .primary-action') as HTMLButtonElement).click();
      fixture.detectChanges();
      (Array.from(el().querySelectorAll('.status-option'))[4] as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(el().textContent).toContain('Status is invalid');
      // Falls back to the value the server still holds.
      expect((el().querySelector('.status-picker-label') as HTMLElement).textContent?.trim()).toBe(
        'Home',
      );
    });
  });
});
