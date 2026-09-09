import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { DashboardService } from './dashboard.service';

type PresenceStatus = 'Home' | 'Away' | 'At work';
interface Roommate {
  name: string;
  initials: string;
  status: PresenceStatus;
  detail: string;
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
  ];
  protected readonly roommates = signal<Roommate[]>([]);
  protected readonly homeCount = computed(
    () => this.roommates().filter((roommate) => roommate.status === 'Home').length,
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
  protected readonly unreadNotifications = computed(
    () => this.dashboard.dashboard()?.unreadNotifications ?? 0,
  );

  constructor(private readonly router: Router) {
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });

    effect(() => {
      const data = this.dashboard.dashboard();
      if (data) {
        this.syncRoommates(data);
      }
    });

    effect(() => {
      const user = this.dashboard.currentUser();
      if (user?.displayName) {
        this.auth.syncUserFromToken();
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
    const statuses: PresenceStatus[] = ['Home', 'At work', 'Away'];
    const currentUserIndex = this.roommates().findIndex((roommate) => roommate.isCurrentUser);
    const current = this.roommates()[currentUserIndex]?.status ?? 'Away';
    const nextStatus = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    this.roommates.update((roommates) =>
      roommates.map((roommate, index) =>
        index === currentUserIndex
          ? {
              ...roommate,
              status: nextStatus,
              detail: nextStatus === 'Home' ? 'In the apartment' : 'Status updated just now',
            }
          : roommate,
      ),
    );
    void this.dashboard
      .updatePresence({ status: nextStatus === 'At work' ? 'WORK' : nextStatus.toUpperCase() })
      .subscribe();
  }

  protected navigateTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  protected async signOut(): Promise<void> {
    await this.auth.logout();
  }

  protected syncRoommates(
    data?: {
      roommates?: Array<{ name: string; status: string; detail: string; isCurrentUser?: boolean }>;
    } | null,
  ): void {
    const rows = data?.roommates ?? [];
    this.roommates.set(
      rows.map((row) => ({
        name: row.name,
        initials: row.name
          .split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        status: row.status === 'HOME' ? 'Home' : row.status === 'AT_WORK' ? 'At work' : 'Away',
        detail: row.detail || 'No status update yet',
        color: row.name === 'Brian' ? '#ef8b69' : row.name === 'Alex' ? '#78a99b' : '#c7a45a',
        isCurrentUser: Boolean(row.isCurrentUser),
      })),
    );
  }

  protected getDisplayName(): string {
    return this.dashboard.currentUser()?.displayName ?? 'Roommate';
  }

  protected getInitials(displayName?: string): string {
    if (!displayName) {
      return 'BR';
    }
    return displayName
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
