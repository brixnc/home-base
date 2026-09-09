import { SlicePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ApartmentInfo,
  DashboardService,
  EventItem,
  NotificationItem,
  ShoppingItem,
} from './dashboard.service';

const pageStyles = `
  :host { display: block; }
  .route-shell { max-width: 980px; margin: 12px auto; padding: 0 5% 48px; color: #293530; }
  .route-banner { margin-bottom: 24px; }
  .route-banner h1 { margin: 7px 0; font: 600 32px 'Space Grotesk', sans-serif; color: #25312d; }
  .route-copy, .muted { color: #78847d; font-size: 13px; }
  .toolbar, form { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 20px 0; }
  label { display: grid; gap: 5px; color: #78847d; font-size: 11px; font-weight: 700; }
  input, textarea, select { min-width: 150px; border: 1px solid #d7ddd7; border-radius: 7px; background: #fbfaf6; padding: 10px 11px; font: inherit; color: #293530; }
  textarea { min-width: 280px; min-height: 80px; resize: vertical; }
  button { border: 0; border-radius: 7px; background: #25312d; color: #fff; padding: 10px 14px; font-weight: 600; cursor: pointer; }
  button.secondary { background: #e9eee9; color: #405048; }
  button.danger { background: #f8e6df; color: #a84f35; }
  button:disabled { opacity: .55; cursor: wait; }
  .list { display: grid; gap: 9px; }
  .item { display: flex; align-items: center; gap: 14px; padding: 15px; border: 1px solid #e1e5df; border-radius: 8px; background: #fbfaf6; }
  .item-main { display: grid; gap: 4px; flex: 1; }
  .item-main strong { color: #34413b; font-size: 14px; }
  .item-main small { color: #78847d; font-size: 12px; }
  .item-actions { display: flex; gap: 7px; align-items: center; }
  .empty, .error { padding: 18px; border-radius: 8px; background: #fbfaf6; color: #78847d; }
  .error { color: #b4422d; }
  .done { text-decoration: line-through; opacity: .6; }
  .status { color: #57906e; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  @media (max-width: 640px) { .route-shell { padding: 0 16px 35px; } form { display: grid; } input, textarea, select { width: 100%; box-sizing: border-box; } .item { align-items: flex-start; } .item-actions { flex-wrap: wrap; } }
`;

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, SlicePipe],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">PLAN TOGETHER</p>
        <h1>Calendar</h1>
        <p class="route-copy">Keep apartment events in one shared place.</p>
      </header>
      <form (ngSubmit)="create()">
        <label
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
        <button type="submit" [disabled]="saving()">
          {{ saving() ? 'Adding...' : 'Add event' }}
        </button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <section class="list">
        @for (event of events(); track event.id) {
          <article class="item">
            <div class="item-main">
              <strong>{{ event.title }}</strong
              ><small
                >{{ event.startTime | slice: 0 : 16 }} ·
                {{ event.location || 'No location' }}</small
              >
            </div>
            <button class="danger" (click)="remove(event)" type="button">Delete</button>
          </article>
        } @empty {
          <p class="empty">No events yet. Add the first one above.</p>
        }
      </section>
    </main>
  `,
})
export class CalendarComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly events = signal<EventItem[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  title = '';
  startTime = '';
  endTime = '';
  location = '';
  ngOnInit(): void {
    this.load();
  }
  create(): void {
    this.saving.set(true);
    this.error.set(null);
    this.service
      .createEvent({
        title: this.title.trim(),
        startTime: this.startTime,
        endTime: this.endTime || undefined,
        location: this.location || undefined,
      })
      .subscribe({
        next: () => {
          this.title = '';
          this.startTime = '';
          this.endTime = '';
          this.location = '';
          this.saving.set(false);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Unable to create this event.');
        },
      });
  }
  remove(event: EventItem): void {
    this.service
      .deleteEvent(event.id)
      .subscribe({
        next: () => this.events.update((items) => items.filter((item) => item.id !== event.id)),
        error: () => this.error.set('Only the event creator can delete this event.'),
      });
  }
  private load(): void {
    this.service
      .listEvents()
      .subscribe({
        next: (items) => this.events.set(items),
        error: () => this.error.set('Unable to load events.'),
      });
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
      <form (ngSubmit)="create()">
        <label
          >Item<input
            [(ngModel)]="name"
            name="name"
            required
            placeholder="Milk, bin bags..." /></label
        ><label
          >Quantity<input [(ngModel)]="quantity" name="quantity" placeholder="Optional" /></label
        ><label
          >Category<select [(ngModel)]="category" name="category">
            <option>GROCERIES</option>
            <option>HOUSEHOLD</option>
            <option>OTHER</option>
          </select></label
        ><button type="submit" [disabled]="saving()">
          {{ saving() ? 'Adding...' : 'Add item' }}
        </button>
      </form>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <section class="list">
        @for (item of items(); track item.id) {
          <article class="item">
            <div class="item-main" [class.done]="item.purchased">
              <strong>{{ item.name }}</strong
              ><small
                >{{ item.quantity || 'No quantity' }} · {{ item.category || 'OTHER' }} ·
                {{ item.addedByName || 'Unknown' }}</small
              >
            </div>
            <div class="item-actions">
              <button class="secondary" (click)="toggle(item)" type="button">
                {{ item.purchased ? 'Uncheck' : 'Bought' }}</button
              ><button class="danger" (click)="remove(item)" type="button">Delete</button>
            </div>
          </article>
        } @empty {
          <p class="empty">The shopping list is empty.</p>
        }
      </section>
    </main>
  `,
})
export class ShoppingComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly items = signal<ShoppingItem[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  name = '';
  quantity = '';
  category = 'GROCERIES';
  ngOnInit(): void {
    this.load();
  }
  create(): void {
    this.saving.set(true);
    this.service
      .createShoppingItem({
        name: this.name.trim(),
        quantity: this.quantity || undefined,
        category: this.category,
      })
      .subscribe({
        next: () => {
          this.name = '';
          this.quantity = '';
          this.saving.set(false);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Unable to add this item.');
        },
      });
  }
  toggle(item: ShoppingItem): void {
    this.service
      .updateShoppingItem(item.id, { purchased: !item.purchased })
      .subscribe({
        next: () =>
          this.items.update((items) =>
            items.map((current) =>
              current.id === item.id ? { ...current, purchased: !current.purchased } : current,
            ),
          ),
        error: () => this.error.set('Unable to update this item.'),
      });
  }
  remove(item: ShoppingItem): void {
    this.service
      .deleteShoppingItem(item.id)
      .subscribe({
        next: () => this.items.update((items) => items.filter((current) => current.id !== item.id)),
        error: () => this.error.set('Unable to delete this item.'),
      });
  }
  private load(): void {
    this.service
      .listShopping()
      .subscribe({
        next: (items) => this.items.set(items),
        error: () => this.error.set('Unable to load shopping items.'),
      });
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
        <p class="route-copy">See who is home and update your own status.</p>
      </header>
      <form (ngSubmit)="update()">
        <label
          >Your status<select [(ngModel)]="status" name="status">
            <option value="HOME">Home</option>
            <option value="AWAY">Away</option>
            <option value="WORK">At work</option>
            <option value="SCHOOL">At school</option>
            <option value="TRAVELING">Traveling</option>
          </select></label
        ><label>Note<input [(ngModel)]="note" name="note" placeholder="Back around 18:30" /></label
        ><button type="submit">Update my status</button>
      </form>
      @if (message()) {
        <p class="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <section class="list">
        @for (roommate of roommates(); track roommate.userId) {
          <article class="item">
            <span class="status">{{ roommate.status }}</span>
            <div class="item-main">
              <strong>{{ roommate.name }}</strong
              ><small>{{ roommate.note || 'No note yet' }}</small>
            </div>
          </article>
        } @empty {
          <p class="empty">No roommate profiles have checked in yet.</p>
        }
      </section>
    </main>
  `,
})
export class RoommatesComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly roommates = signal<
    Array<{ userId: string; name: string; status: string; note?: string }>
  >([]);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  status = 'HOME';
  note = '';
  ngOnInit(): void {
    this.load();
  }
  update(): void {
    this.service.updatePresence({ status: this.status, note: this.note || undefined }).subscribe({
      next: () => {
        this.message.set('Status updated.');
        this.load();
      },
      error: () => this.error.set('Unable to update your status.'),
    });
  }
  private load(): void {
    this.service
      .listPresence()
      .subscribe({
        next: (items) => this.roommates.set(items),
        error: () => this.error.set('Unable to load roommates.'),
      });
  }
}

@Component({
  selector: 'app-feed',
  imports: [RouterLink],
  styles: pageStyles,
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">FROM THE HOUSE</p>
        <h1>Updates</h1>
        <p class="route-copy">Your household notifications and reminders.</p>
      </header>
      <div class="toolbar">
        <button (click)="readAll()" type="button">Mark all as read</button
        ><a routerLink="/dashboard" class="text-button">Back to dashboard →</a>
      </div>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      <section class="list">
        @for (item of notifications(); track item.id) {
          <article class="item">
            <div class="item-main">
              <strong [class.done]="item.read">{{ item.title }}</strong
              ><small>{{ item.message || 'New update from Homebase' }}</small>
            </div>
            <div class="item-actions">
              <span class="status">{{ item.read ? 'Read' : 'Unread' }}</span>
              @if (!item.read) {
                <button class="secondary" (click)="read(item)" type="button">Read</button>
              }
            </div>
          </article>
        } @empty {
          <p class="empty">No updates yet.</p>
        }
      </section>
    </main>
  `,
})
export class FeedComponent implements OnInit {
  private readonly service = inject(DashboardService);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly error = signal<string | null>(null);
  ngOnInit(): void {
    this.load();
  }
  read(item: NotificationItem): void {
    this.service
      .markNotificationRead(item.id)
      .subscribe({
        next: () =>
          this.notifications.update((items) =>
            items.map((current) => (current.id === item.id ? { ...current, read: true } : current)),
          ),
        error: () => this.error.set('Unable to mark this update read.'),
      });
  }
  readAll(): void {
    this.service
      .markAllNotificationsRead()
      .subscribe({
        next: () =>
          this.notifications.update((items) => items.map((item) => ({ ...item, read: true }))),
        error: () => this.error.set('Unable to mark updates read.'),
      });
  }
  private load(): void {
    this.service
      .listNotifications()
      .subscribe({
        next: (items) => this.notifications.set(items),
        error: () => this.error.set('Unable to load updates.'),
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
      <form (ngSubmit)="save()" class="settings-form">
        <label>Apartment name<input [(ngModel)]="apartment.name" name="name" required /></label
        ><label>Address<input [(ngModel)]="apartment.address" name="address" /></label
        ><label>Wi-Fi name<input [(ngModel)]="apartment.wifiName" name="wifiName" /></label
        ><label
          >Wi-Fi password<input [(ngModel)]="apartment.wifiPassword" name="wifiPassword" /></label
        ><label
          >Landlord contact<input
            [(ngModel)]="apartment.landlordContact"
            name="landlordContact" /></label
        ><label
          >Emergency contact<input
            [(ngModel)]="apartment.emergencyContact"
            name="emergencyContact" /></label
        ><label
          >Shared notes<textarea
            [(ngModel)]="apartment.sharedNotes"
            name="sharedNotes"
          ></textarea></label
        ><button type="submit" [disabled]="saving()">
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
  apartment: ApartmentInfo = { name: 'Homebase' };
  ngOnInit(): void {
    this.service
      .getApartment()
      .subscribe({
        next: (apartment) => (this.apartment = { ...this.apartment, ...apartment }),
        error: () => this.error.set('Unable to load apartment details.'),
      });
  }
  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.service.updateApartment(this.apartment).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Unable to save apartment details.');
      },
    });
  }
}
