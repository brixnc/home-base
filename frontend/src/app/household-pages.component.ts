import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AbsenceItem,
  ApartmentInfo,
  DashboardService,
  EventItem,
  FeedPost,
  NotificationItem,
  RoommatePresence,
  ShoppingCategory,
  ShoppingItem,
} from './dashboard.service';

const pageStyles = `
  :host { display: block; }
  .route-shell { max-width: 980px; margin: 12px auto; padding: 0 5% 48px; color: #293530; }
  .route-banner { margin-bottom: 24px; }
  .route-banner h1 { margin: 7px 0; font: 600 32px 'Space Grotesk', sans-serif; color: #25312d; }
  .route-copy, .muted { color: #78847d; font-size: 13px; }
  .toolbar, form, .split-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 20px 0; }
  .split-toolbar { justify-content: space-between; align-items: center; }
  label { display: grid; gap: 5px; color: #78847d; font-size: 11px; font-weight: 700; }
  input, textarea, select { min-width: 150px; border: 1px solid #d7ddd7; border-radius: 7px; background: #fbfaf6; padding: 10px 11px; font: inherit; color: #293530; }
  textarea { min-width: 280px; min-height: 80px; resize: vertical; }
  button { border: 0; border-radius: 7px; background: #25312d; color: #fff; padding: 10px 14px; font-weight: 600; cursor: pointer; }
  button.secondary { background: #e9eee9; color: #405048; }
  button.danger { background: #f8e6df; color: #a84f35; }
  button.ghost { background: transparent; color: #dd7959; padding: 0; }
  button:disabled { opacity: .55; cursor: wait; }
  .list { display: grid; gap: 9px; }
  .item, .card { display: flex; align-items: flex-start; gap: 14px; padding: 15px; border: 1px solid #e1e5df; border-radius: 12px; background: #fbfaf6; }
  .item-main { display: grid; gap: 4px; flex: 1; min-width: 0; }
  .item-main strong { color: #34413b; font-size: 14px; }
  .item-main small { color: #78847d; font-size: 12px; }
  .item-main p { margin: 0; color: #5e6c65; font-size: 12px; line-height: 1.5; }
  .item-actions { display: flex; gap: 7px; align-items: center; flex-wrap: wrap; justify-content: end; }
  .empty, .error, .status, .section-note { padding: 18px; border-radius: 8px; background: #fbfaf6; color: #78847d; }
  .error { color: #b4422d; }
  .status { color: #57906e; }
  .done { text-decoration: line-through; opacity: .6; }
  .status-pill, .meta-pill, .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 8px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
  .status-pill { background: #edf5ee; color: #57906e; }
  .status-pill.away { background: #f6eee2; color: #c57b42; }
  .status-pill.work { background: #f4edd9; color: #a88732; }
  .status-pill.school { background: #e7edfb; color: #5b74c8; }
  .status-pill.traveling { background: #efe6fb; color: #8a63c7; }
  .meta-pill { background: #edf0ec; color: #405048; }
  .badge.high { background: #fbe7df; color: #a84f35; }
  .badge.low { background: #ebf2ec; color: #5d8a69; }
  .grid-2 { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
  .full { grid-column: 1 / -1; }
  .panel-title { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .panel-title h2 { margin: 0; font: 600 20px 'Space Grotesk', sans-serif; }
  .inline-form { margin: 8px 0 0; padding: 15px; border: 1px solid #e1e5df; border-radius: 12px; background: #fff; }
  .stack { display: grid; gap: 12px; }
  .section { margin-top: 28px; }
  .section h2 { margin: 0 0 8px; font: 600 20px 'Space Grotesk', sans-serif; color: #25312d; }
  .text-button { border: 0; background: transparent; color: #dd7959; font-size: 11px; font-weight: 600; padding: 10px 0 0; text-decoration: none; }
  .summary-row { display: flex; gap: 8px; flex-wrap: wrap; }
  @media (max-width: 640px) {
    .route-shell { padding: 0 16px 35px; }
    form, .split-toolbar { display: grid; }
    input, textarea, select { width: 100%; box-sizing: border-box; min-width: 0; }
    .item { align-items: flex-start; }
    .item-actions { justify-content: start; }
    .grid-2 { grid-template-columns: 1fr; }
  }
`;

@Component({
  selector: 'app-calendar',
  imports: [FormsModule],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">PLAN TOGETHER</p>
        <h1>Calendar</h1>
        <p class="route-copy">Keep apartment events in one shared place.</p>
      </header>

      <div class="toolbar">
        <label>
          View
          <select [ngModel]="filter()" (ngModelChange)="filter.set($event)" name="filter">
            <option value="UPCOMING">Upcoming events</option>
            <option value="PAST">Past events</option>
            <option value="ALL">All events</option>
          </select>
        </label>
      </div>

      <form (ngSubmit)="create()">
        <div class="grid-2">
          <label class="full"
            >Event<input
              [(ngModel)]="title"
              name="title"
              required
              placeholder="Dinner, inspection..."
          /></label>
          <label
            >Starts<input [(ngModel)]="startTime" name="startTime" type="datetime-local" required
          /></label>
          <label>Ends<input [(ngModel)]="endTime" name="endTime" type="datetime-local" /></label>
          <label
            >Location<input [(ngModel)]="location" name="location" placeholder="Optional"
          /></label>
          <label class="full"
            >Description<textarea
              [(ngModel)]="description"
              name="description"
              placeholder="Optional details"
            ></textarea></label
          >
        </div>
        <button type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving...' : 'Add event' }}
        </button>
      </form>

      @if (message()) {
        <p class="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (loading()) {
        <p class="empty">Loading events…</p>
      }

      <section class="list">
        @for (event of visibleEvents(); track event.id) {
          <article class="item">
            <div class="item-main">
              <div class="panel-title">
                <strong>{{ event.title }}</strong>
                <span class="meta-pill">{{ event.past ? 'PAST' : 'UPCOMING' }}</span>
              </div>
              <small
                >{{ formatDateTime(event.startTime) }}
                @if (event.endTime) {
                  → {{ formatDateTime(event.endTime) }}
                }
                @if (event.location) {
                  · {{ event.location }}
                }
              </small>
              @if (event.description) {
                <p>{{ event.description }}</p>
              }
              <small>Created by {{ event.creatorName || 'Unknown' }}</small>
            </div>
            <div class="item-actions">
              @if (event.creatorId === dashboard.currentUser()?.id) {
                <button class="secondary" (click)="startEdit(event)" type="button">Edit</button>
              }
              @if (event.creatorId === dashboard.currentUser()?.id) {
                <button class="danger" (click)="remove(event)" type="button">Delete</button>
              }
            </div>
          </article>
          @if (editingId() === event.id) {
            <form class="inline-form" (ngSubmit)="saveEdit(event)">
              <div class="grid-2">
                <label class="full">Title<input [(ngModel)]="editTitle" name="editTitle" required /></label>
                <label>Starts<input [(ngModel)]="editStartTime" name="editStartTime" type="datetime-local" required /></label>
                <label>Ends<input [(ngModel)]="editEndTime" name="editEndTime" type="datetime-local" /></label>
                <label>Location<input [(ngModel)]="editLocation" name="editLocation" /></label>
                <label class="full">Description<textarea [(ngModel)]="editDescription" name="editDescription"></textarea></label>
              </div>
              <div class="item-actions">
                <button type="submit" [disabled]="saving()">Save changes</button>
                <button class="secondary" type="button" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          }
        } @empty {
          @if (!loading()) {
            <p class="empty">No events in this view yet.</p>
          }
        }
      </section>
    </main>
  `,
})
export class CalendarComponent implements OnInit {
  protected readonly dashboard = inject(DashboardService);
  readonly events = signal<EventItem[]>([]);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly filter = signal<'UPCOMING' | 'PAST' | 'ALL'>('UPCOMING');
  readonly editingId = signal<string | null>(null);
  readonly visibleEvents = computed(() => {
    const all = [...this.events()];
    switch (this.filter()) {
      case 'PAST':
        return all.filter((item) => Boolean(item.past)).reverse();
      case 'ALL':
        return all;
      default:
        return all.filter((item) => !item.past);
    }
  });

  title = '';
  startTime = '';
  endTime = '';
  location = '';
  description = '';

  editTitle = '';
  editStartTime = '';
  editEndTime = '';
  editLocation = '';
  editDescription = '';

  ngOnInit(): void {
    if (!this.dashboard.currentUser()) {
      this.dashboard.loadCurrentUser();
    }
    this.load();
  }

  create(): void {
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    this.dashboard
      .createEvent({
        title: this.title.trim(),
        startTime: this.startTime,
        endTime: this.endTime || undefined,
        location: this.location || undefined,
        description: this.description || undefined,
      })
      .subscribe({
        next: (event) => {
          this.events.update((items) => this.sortEvents([event, ...items]));
          this.title = '';
          this.startTime = '';
          this.endTime = '';
          this.location = '';
          this.description = '';
          this.saving.set(false);
          this.message.set('Event added.');
          this.load();
        },
        error: (response) => {
          this.saving.set(false);
          this.error.set(response?.error?.error ?? 'Unable to create this event.');
        },
      });
  }

  startEdit(event: EventItem): void {
    this.editingId.set(event.id);
    this.editTitle = event.title;
    this.editStartTime = this.toDateTimeInput(event.startTime);
    this.editEndTime = this.toDateTimeInput(event.endTime);
    this.editLocation = event.location ?? '';
    this.editDescription = event.description ?? '';
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(event: EventItem): void {
    this.saving.set(true);
    this.error.set(null);
    this.dashboard
      .updateEvent(event.id, {
        title: this.editTitle.trim(),
        startTime: this.editStartTime,
        endTime: this.editEndTime || null,
        location: this.editLocation || null,
        description: this.editDescription || null,
      })
      .subscribe({
        next: (updated) => {
          this.events.update((items) =>
            this.sortEvents(items.map((item) => (item.id === updated.id ? updated : item))),
          );
          this.editingId.set(null);
          this.saving.set(false);
          this.message.set('Event updated.');
        },
        error: (response) => {
          this.saving.set(false);
          this.error.set(response?.error?.error ?? 'Unable to update this event.');
        },
      });
  }

  remove(event: EventItem): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${event.title}"?`)) {
      return;
    }
    this.dashboard.deleteEvent(event.id).subscribe({
      next: () => {
        this.events.update((items) => items.filter((item) => item.id !== event.id));
        this.message.set('Event deleted.');
      },
      error: (response) => {
        this.error.set(response?.error?.error ?? 'Unable to delete this event.');
      },
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return 'No time set';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.listEvents().subscribe({
      next: (items) => {
        this.events.set(this.sortEvents(items));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load events.');
      },
    });
  }

  private sortEvents(items: EventItem[]): EventItem[] {
    return [...items].sort((left, right) => left.startTime.localeCompare(right.startTime));
  }

  private toDateTimeInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value.slice(0, 16);
    }
    const timezoneAdjusted = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return timezoneAdjusted.toISOString().slice(0, 16);
  }
}

@Component({
  selector: 'app-shopping',
  imports: [FormsModule],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">SHARED LIST</p>
        <h1>Shopping</h1>
        <p class="route-copy">Add what the apartment needs and check it off when bought.</p>
      </header>

      <div class="toolbar">
        <label>
          Filter
          <select [ngModel]="filter()" (ngModelChange)="filter.set($event)" name="filter">
            <option value="NEEDED">Needed</option>
            <option value="PURCHASED">Purchased</option>
            <option value="ALL">All</option>
          </select>
        </label>
        <label>
          Sort
          <select [ngModel]="sort()" (ngModelChange)="sort.set($event)" name="sort">
            <option value="NEWEST">Newest</option>
            <option value="CATEGORY">Category</option>
            <option value="NAME">Name</option>
          </select>
        </label>
      </div>

      <form (ngSubmit)="create()">
        <div class="grid-2">
          <label class="full"
            >Item<input
              [(ngModel)]="name"
              name="name"
              required
              placeholder="Milk, bin bags..." /></label
          ><label
            >Quantity<input [(ngModel)]="quantity" name="quantity" placeholder="Optional" /></label
          ><label
            >Category<select [(ngModel)]="category" name="category">
              <option value="FOOD">Food</option>
              <option value="CLEANING">Cleaning</option>
              <option value="BATHROOM">Bathroom</option>
              <option value="HOUSEHOLD">Household</option>
              <option value="OTHER">Other</option>
            </select></label
          >
        </div>
        <button type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving...' : 'Add item' }}
        </button>
      </form>

      @if (message()) {
        <p class="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (loading()) {
        <p class="empty">Loading shopping items…</p>
      }

      <section class="list">
        @for (item of visibleItems(); track item.id) {
          <article class="item">
            <div class="item-main" [class.done]="item.purchased">
              <div class="panel-title">
                <strong>{{ item.name }}</strong>
                <span class="meta-pill">{{ item.category }}</span>
              </div>
              <small
                >{{ item.quantity || 'No quantity' }} ·
                {{ item.addedByName || 'Unknown' }} · {{ formatDateTime(item.createdAt) }}</small
              >
            </div>
            <div class="item-actions">
              <button class="secondary" (click)="toggle(item)" type="button">
                {{ item.purchased ? 'Unmark' : 'Bought' }}</button
              ><button class="secondary" (click)="startEdit(item)" type="button">Edit</button
              ><button class="danger" (click)="remove(item)" type="button">Delete</button>
            </div>
          </article>
          @if (editingId() === item.id) {
            <form class="inline-form" (ngSubmit)="saveEdit(item)">
              <div class="grid-2">
                <label>Name<input [(ngModel)]="editName" name="editName" required /></label>
                <label>Quantity<input [(ngModel)]="editQuantity" name="editQuantity" /></label>
                <label class="full"
                  >Category<select [(ngModel)]="editCategory" name="editCategory">
                    <option value="FOOD">Food</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="BATHROOM">Bathroom</option>
                    <option value="HOUSEHOLD">Household</option>
                    <option value="OTHER">Other</option>
                  </select></label
                >
              </div>
              <div class="item-actions">
                <button type="submit" [disabled]="saving()">Save changes</button>
                <button class="secondary" type="button" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          }
        } @empty {
          @if (!loading()) {
            <p class="empty">No shopping items in this view.</p>
          }
        }
      </section>
    </main>
  `,
})
export class ShoppingComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly items = signal<ShoppingItem[]>([]);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly filter = signal<'NEEDED' | 'PURCHASED' | 'ALL'>('NEEDED');
  readonly sort = signal<'NEWEST' | 'CATEGORY' | 'NAME'>('NEWEST');
  readonly editingId = signal<string | null>(null);
  readonly visibleItems = computed(() => this.applyFiltersAndSort(this.items()));

  name = '';
  quantity = '';
  category: ShoppingCategory = 'FOOD';
  editName = '';
  editQuantity = '';
  editCategory: ShoppingCategory = 'FOOD';

  ngOnInit(): void {
    this.load();
  }

  create(): void {
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    this.service
      .createShoppingItem({
        name: this.name.trim(),
        quantity: this.quantity || undefined,
        category: this.category,
      })
      .subscribe({
        next: (item) => {
          this.items.update((items) => this.applyFiltersAndSort([item, ...items]));
          this.name = '';
          this.quantity = '';
          this.category = 'FOOD';
          this.saving.set(false);
          this.message.set('Shopping item added.');
          this.load();
        },
        error: (response) => {
          this.saving.set(false);
          this.error.set(response?.error?.error ?? 'Unable to add this item.');
        },
      });
  }

  toggle(item: ShoppingItem): void {
    this.service.updateShoppingItem(item.id, { purchased: !item.purchased }).subscribe({
      next: (updated) =>
        this.items.update((items) =>
          this.applyFiltersAndSort(items.map((current) => (current.id === item.id ? updated : current))),
        ),
      error: () => this.error.set('Unable to update this item.'),
    });
  }

  startEdit(item: ShoppingItem): void {
    this.editingId.set(item.id);
    this.editName = item.name;
    this.editQuantity = item.quantity ?? '';
    this.editCategory = item.category;
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(item: ShoppingItem): void {
    this.service
      .updateShoppingItem(item.id, {
        name: this.editName.trim(),
        quantity: this.editQuantity || null,
        category: this.editCategory,
      })
      .subscribe({
        next: (updated) => {
          this.items.update((items) =>
            this.applyFiltersAndSort(items.map((current) => (current.id === item.id ? updated : current))),
          );
          this.editingId.set(null);
          this.message.set('Shopping item updated.');
        },
        error: (response) => this.error.set(response?.error?.error ?? 'Unable to update this item.'),
      });
  }

  remove(item: ShoppingItem): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${item.name}"?`)) {
      return;
    }
    this.service.deleteShoppingItem(item.id).subscribe({
      next: () => {
        this.items.update((items) => items.filter((current) => current.id !== item.id));
        this.message.set('Shopping item deleted.');
      },
      error: () => this.error.set('Unable to delete this item.'),
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return 'Added recently';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private load(): void {
    this.loading.set(true);
    this.service.listShopping().subscribe({
      next: (items) => {
        this.items.set(this.applyFiltersAndSort(items));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load shopping items.');
      },
    });
  }

  private applyFiltersAndSort(items: ShoppingItem[]): ShoppingItem[] {
    let result = [...items];
    if (this.filter() === 'NEEDED') {
      result = result.filter((item) => !item.purchased);
    } else if (this.filter() === 'PURCHASED') {
      result = result.filter((item) => item.purchased);
    }
    result.sort((left, right) => {
      if (this.sort() === 'CATEGORY') {
        return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
      }
      if (this.sort() === 'NAME') {
        return left.name.localeCompare(right.name);
      }
      return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
    });
    return result;
  }
}

@Component({
  selector: 'app-roommates',
  imports: [FormsModule],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">THE HOUSEHOLD</p>
        <h1>Roommates</h1>
        <p class="route-copy">See who is home, update your status, and manage planned absences.</p>
      </header>

      <form (ngSubmit)="update()">
        <div class="grid-2">
          <label
            >Your status<select [(ngModel)]="status" name="status">
              <option value="HOME">HOME</option>
              <option value="AWAY">AWAY</option>
              <option value="WORK">WORK</option>
              <option value="SCHOOL">SCHOOL</option>
              <option value="TRAVELING">TRAVELING</option>
            </select></label
          >
          <label
            >Expected return<input
              [(ngModel)]="backAt"
              name="backAt"
              type="datetime-local"
              placeholder="Optional"
          /></label>
          <label class="full"
            >Note<input [(ngModel)]="note" name="note" placeholder="Back around 18:30" /></label
          >
        </div>
        <button type="submit" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Update my status' }}</button>
      </form>
      @if (message()) {
        <p class="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (loading()) {
        <p class="empty">Loading roommates…</p>
      }
      <section class="list">
        @for (roommate of roommates(); track roommate.userId) {
          <article class="item">
            <span class="status-pill" [class]="statusClass(roommate.status)">{{ displayStatus(roommate.status) }}</span>
            <div class="item-main">
              <strong>{{ roommate.name }}</strong>
              <small>
                {{ roommate.note || 'No note yet' }}
                @if (roommate.backAt) {
                  · Back {{ formatDateTime(roommate.backAt) }}
                }
              </small>
            </div>
          </article>
        } @empty {
          @if (!loading()) {
            <p class="empty">No roommate profiles have checked in yet.</p>
          }
        }
      </section>

      <section class="section">
        <div class="split-toolbar">
          <div>
            <h2>Planned absences</h2>
            <p class="route-copy">Let roommates know when you’ll be away.</p>
          </div>
        </div>

        <form (ngSubmit)="createAbsence()">
          <div class="grid-2">
            <label>Start date<input [(ngModel)]="absenceStartsOn" name="absenceStartsOn" type="date" required /></label>
            <label>End date<input [(ngModel)]="absenceEndsOn" name="absenceEndsOn" type="date" required /></label>
            <label class="full">Note<input [(ngModel)]="absenceNote" name="absenceNote" placeholder="Visiting family" /></label>
          </div>
          <button type="submit" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Add absence' }}</button>
        </form>

        <section class="list">
          @for (absence of absences(); track absence.id) {
            <article class="item">
              <div class="item-main">
                <div class="panel-title">
                  <strong>{{ absence.userName }}</strong>
                  <span class="meta-pill">{{ formatDate(absence.startsOn) }} → {{ formatDate(absence.endsOn) }}</span>
                </div>
                <small>{{ absence.note || 'No note provided' }}</small>
              </div>
              @if (absence.canEdit) {
                <div class="item-actions">
                  <button class="secondary" type="button" (click)="startEditAbsence(absence)">Edit</button>
                  <button class="danger" type="button" (click)="removeAbsence(absence)">Delete</button>
                </div>
              }
            </article>
            @if (editingAbsenceId() === absence.id) {
              <form class="inline-form" (ngSubmit)="saveAbsence(absence)">
                <div class="grid-2">
                  <label>Start date<input [(ngModel)]="editAbsenceStartsOn" name="editAbsenceStartsOn" type="date" required /></label>
                  <label>End date<input [(ngModel)]="editAbsenceEndsOn" name="editAbsenceEndsOn" type="date" required /></label>
                  <label class="full">Note<input [(ngModel)]="editAbsenceNote" name="editAbsenceNote" /></label>
                </div>
                <div class="item-actions">
                  <button type="submit">Save absence</button>
                  <button class="secondary" type="button" (click)="cancelEditAbsence()">Cancel</button>
                </div>
              </form>
            }
          } @empty {
            <p class="empty">No upcoming absences yet.</p>
          }
        </section>
      </section>
    </main>
  `,
})
export class RoommatesComponent implements OnInit {
  readonly dashboard = inject(DashboardService);
  readonly roommates = signal<RoommatePresence[]>([]);
  readonly absences = signal<AbsenceItem[]>([]);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingAbsenceId = signal<string | null>(null);
  status = 'HOME';
  note = '';
  backAt = '';
  absenceStartsOn = '';
  absenceEndsOn = '';
  absenceNote = '';
  editAbsenceStartsOn = '';
  editAbsenceEndsOn = '';
  editAbsenceNote = '';

  ngOnInit(): void {
    this.dashboard.loadCurrentUser();
    this.loadAll();
  }

  update(): void {
    this.saving.set(true);
    this.dashboard
      .updatePresence({
        status: this.status,
        note: this.note || undefined,
        backAt: this.backAt ? new Date(this.backAt).toISOString() : undefined,
      })
      .subscribe({
        next: () => {
          this.message.set('Status updated.');
          this.saving.set(false);
          this.loadAll();
        },
        error: (response) => {
          this.saving.set(false);
          this.error.set(response?.error?.error ?? 'Unable to update your status.');
        },
      });
  }

  createAbsence(): void {
    this.saving.set(true);
    this.dashboard
      .createAbsence({
        startsOn: this.absenceStartsOn,
        endsOn: this.absenceEndsOn,
        note: this.absenceNote || undefined,
      })
      .subscribe({
        next: () => {
          this.absenceStartsOn = '';
          this.absenceEndsOn = '';
          this.absenceNote = '';
          this.saving.set(false);
          this.message.set('Absence added.');
          this.loadAbsences();
        },
        error: (response) => {
          this.saving.set(false);
          this.error.set(response?.error?.error ?? 'Unable to save this absence.');
        },
      });
  }

  startEditAbsence(absence: AbsenceItem): void {
    this.editingAbsenceId.set(absence.id);
    this.editAbsenceStartsOn = absence.startsOn;
    this.editAbsenceEndsOn = absence.endsOn;
    this.editAbsenceNote = absence.note ?? '';
  }

  cancelEditAbsence(): void {
    this.editingAbsenceId.set(null);
  }

  saveAbsence(absence: AbsenceItem): void {
    this.dashboard
      .updateAbsence(absence.id, {
        startsOn: this.editAbsenceStartsOn,
        endsOn: this.editAbsenceEndsOn,
        note: this.editAbsenceNote || null,
      })
      .subscribe({
        next: () => {
          this.editingAbsenceId.set(null);
          this.message.set('Absence updated.');
          this.loadAbsences();
        },
        error: (response) => this.error.set(response?.error?.error ?? 'Unable to update this absence.'),
      });
  }

  removeAbsence(absence: AbsenceItem): void {
    if (typeof window !== 'undefined' && !window.confirm('Delete this absence?')) {
      return;
    }
    this.dashboard.deleteAbsence(absence.id).subscribe({
      next: () => {
        this.absences.update((items) => items.filter((item) => item.id !== absence.id));
        this.message.set('Absence deleted.');
      },
      error: (response) => this.error.set(response?.error?.error ?? 'Unable to delete this absence.'),
    });
  }

  formatDate(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  formatDateTime(value: string): string {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  displayStatus(value: string): string {
    return this.toDisplayStatus(value);
  }

  statusClass(value: string): string {
    return this.toDisplayStatus(value).toLowerCase();
  }

  private loadAll(): void {
    this.loadRoommates();
    this.loadAbsences();
  }

  private loadRoommates(): void {
    this.loading.set(true);
    this.dashboard.listPresence().subscribe({
      next: (items) => {
        this.roommates.set(items);
        const mine = items.find((item) => item.isCurrentUser);
        if (mine) {
          this.status = this.toDisplayStatus(mine.status);
          this.note = mine.note ?? '';
          this.backAt = this.toDateTimeInput(mine.backAt);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load roommates.');
      },
    });
  }

  private loadAbsences(): void {
    this.dashboard.listAbsences().subscribe({
      next: (items) => this.absences.set(items),
      error: () => this.error.set('Unable to load absences.'),
    });
  }

  private toDisplayStatus(value: string): string {
    switch (value.toUpperCase()) {
      case 'AT_WORK':
      case 'WORK':
        return 'WORK';
      case 'AT_SCHOOL':
      case 'SCHOOL':
        return 'SCHOOL';
      default:
        return value.toUpperCase();
    }
  }

  private toDateTimeInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value.slice(0, 16);
    }
    const timezoneAdjusted = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    return timezoneAdjusted.toISOString().slice(0, 16);
  }
}

@Component({
  selector: 'app-feed',
  imports: [FormsModule, RouterLink],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">FROM THE HOUSE</p>
        <h1>Feed</h1>
        <p class="route-copy">Short apartment updates plus your notifications.</p>
      </header>

      <form (ngSubmit)="createPost()">
        <label class="full"
          >Post to the apartment board<textarea
            [(ngModel)]="body"
            name="body"
            maxlength="500"
            placeholder="I'm cooking around 19:00 if anyone wants food."
            required
          ></textarea></label
        >
        <button type="submit" [disabled]="saving()">{{ saving() ? 'Posting...' : 'Post update' }}</button>
      </form>

      @if (message()) {
        <p class="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="section">
        <h2>Apartment board</h2>
        <section class="list">
          @for (post of posts(); track post.id) {
            <article class="item">
              <div class="item-main">
                <strong>{{ post.authorName }}</strong>
                <small>{{ formatDateTime(post.createdAt) }}</small>
                <p>{{ post.body }}</p>
              </div>
              @if (post.canDelete) {
                <div class="item-actions">
                  <button class="danger" type="button" (click)="deletePost(post)">Delete</button>
                </div>
              }
            </article>
          } @empty {
            <p class="empty">No apartment posts yet.</p>
          }
        </section>
      </section>

      <section class="section">
        <div class="split-toolbar">
          <div>
            <h2>Notifications</h2>
            <p class="route-copy">Unread household alerts and reminders.</p>
          </div>
          <div class="item-actions">
            <button (click)="readAll()" type="button">Mark all as read</button
            ><a routerLink="/dashboard" class="text-button">Back to dashboard →</a>
          </div>
        </div>
        <section class="list">
          @for (item of notifications(); track item.id) {
            <article class="item">
              <div class="item-main">
                <div class="panel-title">
                  <strong [class.done]="item.read">{{ item.title }}</strong>
                  <span class="meta-pill">{{ item.type || 'INFO' }}</span>
                </div>
                <small>{{ formatDateTime(item.createdAt) }}</small>
                <p>{{ item.message || 'New update from Homebase' }}</p>
              </div>
              <div class="item-actions">
                <span class="status-pill" [class.away]="item.read">{{ item.read ? 'READ' : 'UNREAD' }}</span>
                @if (!item.read) {
                  <button class="secondary" (click)="read(item)" type="button">Mark read</button>
                }
              </div>
            </article>
          } @empty {
            <p class="empty">No notifications yet.</p>
          }
        </section>
      </section>
    </main>
  `,
})
export class FeedComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly posts = signal<FeedPost[]>([]);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly saving = signal(false);
  body = '';

  ngOnInit(): void {
    this.load();
  }

  createPost(): void {
    this.saving.set(true);
    this.service.createFeedPost({ body: this.body.trim() }).subscribe({
      next: (post) => {
        this.posts.update((items) => [post, ...items]);
        this.body = '';
        this.saving.set(false);
        this.message.set('Post added.');
        this.loadNotifications();
      },
      error: (response) => {
        this.saving.set(false);
        this.error.set(response?.error?.error ?? 'Unable to create this post.');
      },
    });
  }

  deletePost(post: FeedPost): void {
    if (typeof window !== 'undefined' && !window.confirm('Delete this post?')) {
      return;
    }
    this.service.deleteFeedPost(post.id).subscribe({
      next: () => {
        this.posts.update((items) => items.filter((item) => item.id !== post.id));
        this.message.set('Post deleted.');
      },
      error: (response) => this.error.set(response?.error?.error ?? 'Unable to delete this post.'),
    });
  }

  read(item: NotificationItem): void {
    this.service.markNotificationRead(item.id).subscribe({
      next: () =>
        this.notifications.update((items) =>
          items.map((current) => (current.id === item.id ? { ...current, read: true } : current)),
        ),
      error: () => this.error.set('Unable to mark this update read.'),
    });
  }

  readAll(): void {
    this.service.markAllNotificationsRead().subscribe({
      next: () =>
        this.notifications.update((items) => items.map((item) => ({ ...item, read: true }))),
      error: () => this.error.set('Unable to mark updates read.'),
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return 'Just now';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private load(): void {
    this.loadPosts();
    this.loadNotifications();
  }

  private loadPosts(): void {
    this.service.listFeedPosts().subscribe({
      next: (items) => this.posts.set(items),
      error: () => this.error.set('Unable to load apartment posts.'),
    });
  }

  private loadNotifications(): void {
    this.service.listNotifications().subscribe({
      next: (items) => this.notifications.set(items),
      error: () => this.error.set('Unable to load notifications.'),
    });
  }
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">HOMEBASE</p>
        <h1>Apartment settings</h1>
        <p class="route-copy">Keep the shared household details current.</p>
      </header>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (loading()) {
        <p class="empty">Loading apartment details…</p>
      }
      <form (ngSubmit)="save()" class="settings-form">
        <div class="grid-2">
          <label>Apartment name<input [(ngModel)]="apartment.name" name="name" required /></label
          ><label>Address<input [(ngModel)]="apartment.address" name="address" /></label
          ><label>Wi-Fi name<input [(ngModel)]="apartment.wifiName" name="wifiName" /></label
          ><label
            >Wi-Fi password<input
              [(ngModel)]="apartment.wifiPassword"
              [type]="showWifiPassword() ? 'text' : 'password'"
              name="wifiPassword"
              [placeholder]="apartment.hasWifiPassword && !showWifiPassword() ? 'Saved password hidden' : ''"
          /></label>
          <label class="full"
            ><button class="secondary" type="button" (click)="toggleWifiPassword()">
              {{ showWifiPassword() ? 'Hide password' : apartment.hasWifiPassword ? 'Reveal saved password' : 'Add password' }}
            </button></label
          >
          <label
            >Landlord contact<input
              [(ngModel)]="apartment.landlordContact"
              name="landlordContact" /></label
          ><label
            >Emergency contact<input
              [(ngModel)]="apartment.emergencyContact"
              name="emergencyContact" /></label
          ><label
            class="full"
            >Shared notes<textarea
              [(ngModel)]="apartment.sharedNotes"
              name="sharedNotes"
            ></textarea></label
          >
        </div>
        <button type="submit" [disabled]="saving()">
          {{ saving() ? 'Saving...' : 'Save apartment details' }}
        </button>
      </form>
      @if (saved()) {
        <p class="status">Apartment details saved.</p>
      }
    </main>
  `,
})
export class SettingsComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly showWifiPassword = signal(false);
  apartment: ApartmentInfo = { name: 'Homebase' };

  ngOnInit(): void {
    this.service.getApartment().subscribe({
      next: (apartment) => {
        this.apartment = { ...this.apartment, ...apartment };
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load apartment details.');
        this.loading.set(false);
      },
    });
  }

  toggleWifiPassword(): void {
    if (this.showWifiPassword()) {
      this.showWifiPassword.set(false);
      this.apartment.wifiPassword = '';
      return;
    }
    if (this.apartment.hasWifiPassword) {
      this.service.revealApartmentPassword().subscribe({
        next: (response) => {
          this.apartment.wifiPassword = response.wifiPassword ?? '';
          this.showWifiPassword.set(true);
        },
        error: () => this.error.set('Unable to reveal the Wi-Fi password.'),
      });
      return;
    }
    this.showWifiPassword.set(true);
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);
    this.service.updateApartment(this.apartment).subscribe({
      next: (apartment) => {
        this.apartment = { ...this.apartment, ...apartment };
        this.saving.set(false);
        this.saved.set(true);
        if (!this.showWifiPassword()) {
          this.apartment.wifiPassword = '';
        }
      },
      error: (response) => {
        this.saving.set(false);
        this.error.set(response?.error?.error ?? 'Unable to save apartment details.');
      },
    });
  }
}
