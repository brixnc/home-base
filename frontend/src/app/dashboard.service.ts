import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

export type PresenceStatus = 'HOME' | 'AWAY' | 'AT_WORK' | 'AT_SCHOOL' | 'TRAVELING';
export type ChorePriority = 'LOW' | 'NORMAL' | 'HIGH';
export type ShoppingCategory = 'FOOD' | 'CLEANING' | 'BATHROOM' | 'HOUSEHOLD' | 'OTHER';

export interface DashboardRoommate {
  id?: string;
  name: string;
  status: PresenceStatus | string;
  detail: string;
  note?: string | null;
  backAt?: string | null;
  email?: string;
  isCurrentUser?: boolean;
}

export interface DashboardEventItem {
  id?: string;
  title: string;
  date?: string;
  startTime?: string;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  creatorId?: string | null;
  creatorName?: string | null;
  past?: boolean;
}

export interface DashboardChoreItem {
  id?: string;
  title: string;
  assignee?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  priority?: ChorePriority | string;
  completed?: boolean;
  description?: string | null;
  overdue?: boolean;
  dueToday?: boolean;
}

export interface DashboardShoppingItem {
  id?: string;
  name: string;
  quantity?: string | null;
  category?: ShoppingCategory | string;
  purchased?: boolean;
  addedBy?: string;
  createdAt?: string;
}

export interface DashboardResponse {
  roommates: DashboardRoommate[];
  events: DashboardEventItem[];
  chores: DashboardChoreItem[];
  shopping: DashboardShoppingItem[];
  notifications?: NotificationItem[];
  apartment?: ApartmentInfo;
  unreadNotifications?: number;
  myStatus?: string;
  today?: string;
  hasOpenChores?: boolean;
  overdueChoreCount?: number;
  todayChoreCount?: number;
  outstandingShoppingCount?: number;
  purchasedShoppingCount?: number;
}

export interface Chore {
  id: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  priority: ChorePriority;
  completed: boolean;
  overdue?: boolean;
  dueToday?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  creatorId?: string | null;
  creatorName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  past?: boolean;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string | null;
  category: ShoppingCategory;
  purchased: boolean;
  addedById?: string | null;
  addedByName?: string | null;
  createdAt?: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message?: string | null;
  type?: string | null;
  read: boolean;
  createdAt?: string;
}

export interface ApartmentInfo {
  id?: string | null;
  name: string;
  address?: string | null;
  wifiName?: string | null;
  wifiPassword?: string | null;
  hasWifiPassword?: boolean;
  landlordContact?: string | null;
  emergencyContact?: string | null;
  sharedNotes?: string | null;
}

export interface RoommatePresence {
  userId: string;
  name: string;
  status: PresenceStatus | string;
  note?: string | null;
  backAt?: string | null;
  updatedAt?: string | null;
  isCurrentUser?: boolean;
}

export interface AbsenceItem {
  id: string;
  userId: string;
  userName: string;
  startsOn: string;
  endsOn: string;
  note?: string | null;
  createdAt?: string | null;
  canEdit: boolean;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt?: string | null;
  canDelete: boolean;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiBaseUrl = 'http://localhost:8082/api';
  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly currentUser = signal<
    | {
        id?: string;
        keycloakUserId?: string;
        displayName?: string;
        email?: string;
        status?: string;
        note?: string | null;
        backAt?: string | null;
      }
    | null
  >(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  loadCurrentUser(): void {
    this.http
      .get<{
        id?: string;
        keycloakUserId?: string;
        displayName?: string;
        email?: string;
        status?: string;
        note?: string | null;
        backAt?: string | null;
      }>(`${this.apiBaseUrl}/users/me`)
      .subscribe({
        next: (user) => this.currentUser.set(user),
        error: () => this.currentUser.set(null),
      });
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<DashboardResponse>(`${this.apiBaseUrl}/dashboard`).subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load the home dashboard right now.');
      },
    });
  }

  private refreshSharedState(options?: { currentUser?: boolean }): void {
    this.loadDashboard();
    if (options?.currentUser) {
      this.loadCurrentUser();
    }
  }

  listChores() {
    return this.http.get<Chore[]>(`${this.apiBaseUrl}/chores`);
  }

  createChore(request: {
    title: string;
    description?: string;
    dueDate?: string;
    assigneeId?: string;
    priority?: ChorePriority;
  }) {
    return this.http
      .post<Chore>(`${this.apiBaseUrl}/chores`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  updateChore(
    id: string,
    request: {
      completed?: boolean;
      title?: string;
      description?: string | null;
      dueDate?: string | null;
      assigneeId?: string | null;
      priority?: ChorePriority;
    },
  ) {
    return this.http
      .put<Chore>(`${this.apiBaseUrl}/chores/${id}`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteChore(id: string) {
    return this.http
      .delete<void>(`${this.apiBaseUrl}/chores/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listEvents() {
    return this.http.get<EventItem[]>(`${this.apiBaseUrl}/events`);
  }

  createEvent(request: {
    title: string;
    startTime: string;
    endTime?: string;
    location?: string;
    description?: string;
  }) {
    return this.http
      .post<EventItem>(`${this.apiBaseUrl}/events`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  updateEvent(
    id: string,
    request: {
      title?: string;
      startTime?: string;
      endTime?: string | null;
      location?: string | null;
      description?: string | null;
    },
  ) {
    return this.http
      .put<EventItem>(`${this.apiBaseUrl}/events/${id}`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteEvent(id: string) {
    return this.http
      .delete<void>(`${this.apiBaseUrl}/events/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listShopping() {
    return this.http.get<ShoppingItem[]>(`${this.apiBaseUrl}/shopping`);
  }

  createShoppingItem(request: { name: string; quantity?: string; category?: ShoppingCategory }) {
    return this.http
      .post<ShoppingItem>(`${this.apiBaseUrl}/shopping`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  updateShoppingItem(
    id: string,
    request: { purchased?: boolean; name?: string; quantity?: string | null; category?: ShoppingCategory },
  ) {
    return this.http
      .put<ShoppingItem>(`${this.apiBaseUrl}/shopping/${id}`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteShoppingItem(id: string) {
    return this.http
      .delete<void>(`${this.apiBaseUrl}/shopping/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listPresence() {
    return this.http.get<RoommatePresence[]>(`${this.apiBaseUrl}/presence`);
  }

  updatePresence(request: { status: string; note?: string; backAt?: string }) {
    return this.http
      .put<RoommatePresence>(`${this.apiBaseUrl}/presence/me`, request)
      .pipe(tap(() => this.refreshSharedState({ currentUser: true })));
  }

  listNotifications() {
    return this.http.get<NotificationItem[]>(`${this.apiBaseUrl}/notifications`);
  }

  markNotificationRead(id: string) {
    return this.http
      .put<NotificationItem>(`${this.apiBaseUrl}/notifications/${id}/read`, {})
      .pipe(tap(() => this.refreshSharedState()));
  }

  markAllNotificationsRead() {
    return this.http
      .put(`${this.apiBaseUrl}/notifications/read-all`, {})
      .pipe(tap(() => this.refreshSharedState()));
  }

  getApartment() {
    return this.http.get<ApartmentInfo>(`${this.apiBaseUrl}/apartment`);
  }

  revealApartmentPassword() {
    return this.http.get<{ wifiPassword?: string | null; hasWifiPassword: boolean }>(
      `${this.apiBaseUrl}/apartment/password`,
    );
  }

  updateApartment(apartment: ApartmentInfo) {
    return this.http
      .put<ApartmentInfo>(`${this.apiBaseUrl}/apartment`, apartment)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listAbsences() {
    return this.http.get<AbsenceItem[]>(`${this.apiBaseUrl}/absences`);
  }

  createAbsence(request: { startsOn: string; endsOn: string; note?: string }) {
    return this.http.post<AbsenceItem>(`${this.apiBaseUrl}/absences`, request);
  }

  updateAbsence(id: string, request: { startsOn?: string; endsOn?: string; note?: string | null }) {
    return this.http.put<AbsenceItem>(`${this.apiBaseUrl}/absences/${id}`, request);
  }

  deleteAbsence(id: string) {
    return this.http.delete<void>(`${this.apiBaseUrl}/absences/${id}`);
  }

  listFeedPosts() {
    return this.http.get<FeedPost[]>(`${this.apiBaseUrl}/feed-posts`);
  }

  createFeedPost(request: { body: string }) {
    return this.http
      .post<FeedPost>(`${this.apiBaseUrl}/feed-posts`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteFeedPost(id: string) {
    return this.http
      .delete<void>(`${this.apiBaseUrl}/feed-posts/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }
}
