import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  DashboardAbsence,
  DashboardChoreItem,
  DashboardEventItem,
  DashboardRoommate,
  DashboardService,
} from './dashboard.service';
import {
  PRESENCE_STATUS_OPTIONS,
  PresenceStatusValue,
  normalizePresenceStatus,
  presenceStatusClass,
  presenceStatusLabel,
  presenceStatusShortLabel,
} from './presence-status';

interface RoommateCard {
  name: string;
  initials: string;
  status: string;
  detail: string;
  backAt?: string | null;
  color: string;
  isCurrentUser: boolean;
}

const SHOPPING_CATEGORY_LABELS: Record<string, string> = {
  FOOD: 'Food',
  CLEANING: 'Cleaning',
  BATHROOM: 'Bathroom',
  HOUSEHOLD: 'Household',
  OTHER: 'Other',
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);

  protected readonly statusOptions = PRESENCE_STATUS_OPTIONS;
  protected readonly statusPickerOpen = signal(false);
  protected readonly savingStatus = signal(false);
  protected readonly statusError = signal<string | null>(null);
  /** Shows the chosen status instantly while the API call is in flight. */
  private readonly optimisticStatus = signal<PresenceStatusValue | null>(null);

  protected readonly roommates = signal<RoommateCard[]>([]);
  protected readonly homeCount = computed(
    () => this.roommates().filter((roommate) => roommate.status === 'HOME').length,
  );
  protected readonly apartmentName = computed(
    () => this.dashboard.dashboard()?.apartment?.name ?? 'Homebase',
  );
  protected readonly apartmentAddress = computed(
    () => this.dashboard.dashboard()?.apartment?.address ?? 'Shared apartment details',
  );
  protected readonly upcomingEvents = computed(() => this.dashboard.dashboard()?.events ?? []);
  protected readonly chores = computed(() => this.dashboard.dashboard()?.chores ?? []);
  protected readonly shopping = computed(() => this.dashboard.dashboard()?.shopping ?? []);
  protected readonly absences = computed(() => this.dashboard.dashboard()?.absences ?? []);
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
  /** The few items someone still needs to buy — not the whole shopping page. */
  protected readonly outstandingShopping = computed(() =>
    this.shopping()
      .filter((item) => !item.purchased)
      .slice(0, 4),
  );
  protected readonly openChoreCount = computed(
    () => this.chores().filter((item) => !item.completed).length,
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

  /** Current user's presence, preferring the optimistic value while saving. */
  protected readonly myStatus = computed<PresenceStatusValue>(() => {
    const pending = this.optimisticStatus();
    if (pending) {
      return pending;
    }
    return normalizePresenceStatus(
      this.dashboard.currentUser()?.status ?? this.dashboard.dashboard()?.myStatus,
    );
  });

  constructor() {
    effect(() => {
      const data = this.dashboard.dashboard();
      if (data) {
        this.syncRoommates(data.roommates ?? []);
      }
    });
  }

  protected toggleStatusPicker(): void {
    this.statusPickerOpen.update((open) => !open);
  }

  protected closeStatusPicker(): void {
    this.statusPickerOpen.set(false);
  }

  protected selectStatus(status: PresenceStatusValue): void {
    this.closeStatusPicker();
    if (status === this.myStatus()) {
      return;
    }
    this.statusError.set(null);
    this.savingStatus.set(true);
    this.optimisticStatus.set(status);
    this.dashboard.updatePresence({ status }).subscribe({
      next: () => {
        this.savingStatus.set(false);
        this.optimisticStatus.set(null);
      },
      error: (response) => {
        this.savingStatus.set(false);
        this.optimisticStatus.set(null);
        this.statusError.set(response?.error?.error ?? 'Unable to update your status.');
      },
    });
  }

  protected navigateTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  protected statusLabel(status: string | undefined | null): string {
    return presenceStatusShortLabel(status);
  }

  protected statusFullLabel(status: string | undefined | null): string {
    return presenceStatusLabel(status);
  }

  protected statusClass(status: string | undefined | null): string {
    return presenceStatusClass(status);
  }

  protected categoryLabel(category: string | undefined | null): string {
    if (!category) {
      return SHOPPING_CATEGORY_LABELS['OTHER'];
    }
    return SHOPPING_CATEGORY_LABELS[category.toUpperCase()] ?? category;
  }

  protected formatEventDate(event: DashboardEventItem): string {
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

  protected formatAbsenceRange(absence: DashboardAbsence): string {
    const start = this.formatDueDate(absence.startsOn);
    const end = this.formatDueDate(absence.endsOn);
    return start === end ? start : `${start} – ${end}`;
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

  protected choreBucketLabel(item: DashboardChoreItem): string {
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
        status: presenceStatusShortLabel(row.status),
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
