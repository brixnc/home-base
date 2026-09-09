import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

export interface DashboardRoommate {
  id?: string;
  name: string;
  status: string;
  detail: string;
  email?: string;
  isCurrentUser?: boolean;
}

export interface DashboardResponse {
  roommates: DashboardRoommate[];
  events: Array<{
    id?: string;
    title: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
  }>;
  chores: Array<{
    id?: string;
    title: string;
    assignee?: string;
    dueDate?: string;
    completed?: boolean;
    description?: string;
  }>;
  shopping: Array<{
    id?: string;
    name: string;
    quantity?: string;
    category?: string;
    purchased?: boolean;
    addedBy?: string;
  }>;
  notifications?: Array<{
    id?: string;
    title: string;
    message?: string;
    read?: boolean;
    type?: string;
  }>;
  apartment?: {
    name?: string;
    address?: string;
    wifiName?: string;
    landlordContact?: string;
    emergencyContact?: string;
    sharedNotes?: string;
  };
  unreadNotifications?: number;
  myStatus?: string;
  today?: string;
  hasOpenChores?: boolean;
}

export interface Chore {
  id: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  completed: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  creatorId?: string;
  creatorName?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string | null;
  category?: string | null;
  purchased: boolean;
  addedByName?: string | null;
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
  id?: string;
  name: string;
  address?: string;
  wifiName?: string;
  wifiPassword?: string;
  landlordContact?: string;
  emergencyContact?: string;
  sharedNotes?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly currentUser = signal<{ displayName?: string; email?: string; status?: string } | null>(
    null,
  );
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  loadCurrentUser(): void {
    this.http
      .get<{ id?: string; displayName?: string; email?: string; status?: string }>(
        'http://localhost:8082/api/users/me',
      )
      .subscribe({
        next: (user) => this.currentUser.set(user),
        error: () => this.currentUser.set(null),
      });
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<DashboardResponse>('http://localhost:8082/api/dashboard').subscribe({
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
    return this.http.get<Chore[]>('http://localhost:8082/api/chores');
  }

  createChore(request: { title: string; description?: string; dueDate?: string }) {
    return this.http
      .post<Chore>('http://localhost:8082/api/chores', request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  updateChore(id: string, request: { completed?: boolean; title?: string; dueDate?: string }) {
    return this.http
      .put<Chore>(`http://localhost:8082/api/chores/${id}`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteChore(id: string) {
    return this.http
      .delete<void>(`http://localhost:8082/api/chores/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listEvents() {
    return this.http.get<EventItem[]>('http://localhost:8082/api/events');
  }

  createEvent(request: {
    title: string;
    startTime: string;
    endTime?: string;
    location?: string;
    description?: string;
  }) {
    return this.http
      .post<EventItem>('http://localhost:8082/api/events', request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteEvent(id: string) {
    return this.http
      .delete<void>(`http://localhost:8082/api/events/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listShopping() {
    return this.http.get<ShoppingItem[]>('http://localhost:8082/api/shopping');
  }

  createShoppingItem(request: { name: string; quantity?: string; category?: string }) {
    return this.http
      .post<ShoppingItem>('http://localhost:8082/api/shopping', request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  updateShoppingItem(
    id: string,
    request: { purchased?: boolean; name?: string; quantity?: string; category?: string },
  ) {
    return this.http
      .put<ShoppingItem>(`http://localhost:8082/api/shopping/${id}`, request)
      .pipe(tap(() => this.refreshSharedState()));
  }

  deleteShoppingItem(id: string) {
    return this.http
      .delete<void>(`http://localhost:8082/api/shopping/${id}`)
      .pipe(tap(() => this.refreshSharedState()));
  }

  listPresence() {
    return this.http.get<
      Array<{ userId: string; name: string; status: string; note?: string; backAt?: string }>
    >('http://localhost:8082/api/presence');
  }

  updatePresence(request: { status: string; note?: string; backAt?: string }) {
    return this.http
      .put('http://localhost:8082/api/presence/me', request)
      .pipe(tap(() => this.refreshSharedState({ currentUser: true })));
  }

  listNotifications() {
    return this.http.get<NotificationItem[]>('http://localhost:8082/api/notifications');
  }

  markNotificationRead(id: string) {
    return this.http
      .put<NotificationItem>(`http://localhost:8082/api/notifications/${id}/read`, {})
      .pipe(tap(() => this.refreshSharedState()));
  }

  markAllNotificationsRead() {
    return this.http
      .put('http://localhost:8082/api/notifications/read-all', {})
      .pipe(tap(() => this.refreshSharedState()));
  }

  getApartment() {
    return this.http.get<ApartmentInfo>('http://localhost:8082/api/apartment');
  }

  updateApartment(apartment: ApartmentInfo) {
    return this.http
      .put<ApartmentInfo>('http://localhost:8082/api/apartment', apartment)
      .pipe(tap(() => this.refreshSharedState()));
  }
}
