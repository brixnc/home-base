import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { Chore, DashboardRoommate, DashboardService, EventItem } from './dashboard.service';

interface RoommateCard {
  name: string;
  initials: string;
  status: string;
  detail: string;
  backAt?: string | null;
  color: string;
  isCurrentUser: boolean;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly currentUrl = signal('/dashboard');
  private readonly auth = inject(AuthService);
  protected readonly dashboard = inject(DashboardService);

  protected readonly navigation = [
    { label: 'Home', icon: '⌂', route: '/dashboard' },
    { label: 'Calendar', icon: '▣', route: '/calendar' },
    { label: 'Chores', icon: '✓', route: '/chores' },
    { label: 'Shopping', icon: '▱', route: '/shopping' },
    { label: 'Roommates', icon: '◎', route: '/roommates' },
    { label: 'Feed', icon: '✦', route: '/feed' },
  ];
  protected readonly roommates = signal<RoommateCard[]>([]);
  protected readonly homeCount = computed(
    () => this.roommates().filter((roommate) => roommate.status === 'HOME').length,
  );
  protected readonly isDashboard = computed(() => this.currentUrl() === '/dashboard');
  protected readonly apartmentName = computed(
    () => this.dashboard.dashboard()?.apartment?.name ?? 'Homebase',
  );
  protected readonly apartmentAddress = computed(
    () => this.dashboard.dashboard()?.apartment?.address ?? 'Shared apartment details',
  );
  protected readonly upcomingEvents = computed(() => this.dashboard.dashboard()?.events ?? []);
  protected readonly chores = computed(() => this.dashboard.dashboard()?.chores ?? []);
  protected readonly shopping = computed(() => this.dashboard.dashboard()?.shopping ?? []);
  protected readonly notifications = computed(() => this.dashboard.dashboard()?.notifications ?? []);
  protected readonly unreadNotifications = computed(
    () => this.dashboard.dashboard()?.unreadNotifications ?? 0,
  );
  protected readonly outstandingShoppingCount = computed(
    () => this.dashboard.dashboard()?.outstandingShoppingCount ?? 0,
  );
  protected readonly purchasedShoppingCount = computed(
    () => this.dashboard.dashboard()?.purchasedShoppingCount ?? 0,
  );
  protected readonly overdueChores = computed(() =>
    this.chores().filter((item) => !item.completed && Boolean(item.overdue)).slice(0, 2),
  );
  protected readonly todayChores = computed(() =>
    this.chores().filter((item) => !item.completed && Boolean(item.dueToday)).slice(0, 2),
  );
  protected readonly upcomingChores = computed(() =>
    this.chores()
      .filter((item) => !item.completed && !item.overdue && !item.dueToday)
      .slice(0, 2),
  );

  constructor(private readonly router: Router) {
    this.currentUrl.set(this.router.url || '/dashboard');

    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });

    effect(() => {
      const data = this.dashboard.dashboard();
      if (data) {
        this.syncRoommates(data.roommates ?? []);
      }
    });

    void this.auth.init().then((authenticated) => {
      if (!authenticated) {
        return;
      }

      this.dashboard.loadCurrentUser();
      this.dashboard.loadDashboard();
      return undefined;
    });
  }

  protected cycleMyStatus(): void {
    const statuses = ['HOME', 'WORK', 'AWAY', 'SCHOOL', 'TRAVELING'];
    const current = this.dashboard.currentUser()?.status;
    const normalizedCurrent = this.statusLabel(current);
    const nextStatus = statuses[(statuses.indexOf(normalizedCurrent) + 1) % statuses.length];
    void this.dashboard.updatePresence({ status: nextStatus }).subscribe();
  }

  protected navigateTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
  }

  protected statusLabel(status: string | undefined | null): string {
    const normalized = (status ?? 'AWAY').toUpperCase();
    switch (normalized) {
      case 'AT_WORK':
        return 'WORK';
      case 'AT_SCHOOL':
        return 'SCHOOL';
      default:
        return normalized;
    }
  }

  protected statusClass(status: string | undefined | null): string {
    return this.statusLabel(status).toLowerCase();
  }

  protected formatEventDate(event: EventItem): string {
    const value = event.startTime || event.date;
    if (!value) {
      return 'Upcoming';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return event.date ?? value;
    }
    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatDueDate(value?: string | null): string {
    if (!value) {
      return 'No due date';
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  protected formatBackAt(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return `Back ${parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  protected choreBucketLabel(item: Chore): string {
    if (item.overdue) {
      return 'OVERDUE';
    }
    if (item.dueToday) {
      return 'TODAY';
    }
    return item.priority ?? 'OPEN';
  }

  protected getDisplayName(): string {
    return this.dashboard.currentUser()?.displayName ?? 'Roommate';
  }

  protected getInitials(displayName?: string): string {
    if (!displayName) {
      return 'HB';
    }
    return displayName
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  private syncRoommates(rows: DashboardRoommate[]): void {
    this.roommates.set(
      rows.map((row, index) => ({
        name: row.name,
        initials: this.getInitials(row.name),
        status: this.statusLabel(row.status),
        detail: row.note || row.detail || 'No update yet',
        backAt: row.backAt,
        color: this.colorForIndex(index),
        isCurrentUser: Boolean(row.isCurrentUser),
      })),
    );
  }

  private colorForIndex(index: number): string {
    const palette = ['#ef8b69', '#78a99b', '#c7a45a', '#7c8df0', '#d975a0', '#57a8b5'];
    return palette[index % palette.length];
  }
}
