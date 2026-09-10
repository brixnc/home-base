import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PRESENCE_STATUS_OPTIONS,
  PresenceStatusValue,
  normalizePresenceStatus,
  presenceStatusClass,
  presenceStatusShortLabel,
} from './presence-status';
import { RouterLink } from '@angular/router';
import {
  AbsenceItem,
  ApartmentInfo,
  ApartmentUpdateRequest,
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
  .status-pill.dnd { background: #fae3e1; color: #b8524c; }
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
  .wifi-actions { gap: 8px; }
  .wifi-actions-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .wifi-hint { color: #78847d; font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .wifi-hint.warning { color: #a84f35; }
  @media (max-width: 640px) {
    .route-shell { padding: 0 16px 35px; }
    form, .split-toolbar { display: grid; }
    input, textarea, select { width: 100%; box-sizing: border-box; min-width: 0; }
    /* Stack card content above its actions, otherwise the text column gets
       squeezed to a few characters next to the buttons. */
    .item { align-items: stretch; flex-direction: column; gap: 10px; }
    .item-main { width: 100%; }
    .item-actions { justify-content: flex-start; width: 100%; }
    .item-actions button { flex: 1; min-width: 88px; }
    .grid-2 { grid-template-columns: 1fr; }
  }
`;

interface CalendarDay {
  key: string;
  dayNumber: number;
  label: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  events: EventItem[];
}

/** Local `YYYY-MM-DD` key, matching the `date` field the events API returns. */
function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const calendarStyles = `
  .view-toggle { display: inline-flex; gap: 4px; padding: 4px; margin: 4px 0 8px; border: 1px solid #e1e5df; border-radius: 999px; background: #fbfaf6; }
  .view-toggle button { border: 0; border-radius: 999px; background: transparent; color: #6e7a74; padding: 8px 18px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
  .view-toggle button.selected { background: #25312d; color: #fff; }

  .calendar { margin: 8px 0 4px; }
  .calendar-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .calendar-bar button.secondary { min-width: 42px; font-size: 18px; line-height: 1; }
  .calendar-title { display: flex; align-items: center; gap: 10px; }
  .calendar-title strong { font: 600 19px 'Space Grotesk', sans-serif; color: #25312d; }

  .calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .calendar-weekday { padding: 6px 4px; color: #8b958e; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; text-align: center; }
  .calendar-day {
    display: grid;
    align-content: start;
    gap: 4px;
    min-height: 92px;
    padding: 7px 6px;
    border: 1px solid #e8e8df;
    border-radius: 9px;
    background: #fbfaf6;
    color: #34413b;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .calendar-day:hover { border-color: #cdd6cd; }
  .calendar-day.outside { background: #f6f6f1; color: #b3bdb6; }
  .calendar-day.today .calendar-day-number { background: #ef8b69; color: #fff; }
  .calendar-day.selected { border-color: #dd7959; box-shadow: 0 0 0 1px #dd7959; }
  .calendar-day-number { display: inline-grid; place-items: center; width: 23px; height: 23px; border-radius: 50%; font-size: 12px; font-weight: 600; }
  .calendar-day-events { display: grid; gap: 3px; min-width: 0; }
  .calendar-chip { overflow: hidden; padding: 2px 5px; border-radius: 4px; background: #e7f0eb; color: #4d7c62; font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
  .calendar-more { color: #8b958e; font-size: 9px; font-weight: 700; }
  .calendar-dot { display: none; }

  .calendar-selection { margin-top: 18px; display: grid; gap: 9px; }
  .calendar-selection h2 { margin: 0; font: 600 16px 'Space Grotesk', sans-serif; color: #25312d; }

  @media (max-width: 640px) {
    /* A full month grid with titles is unreadable on a phone: show compact
       day cells with an event dot, and the details for the selected day below. */
    .calendar-grid { gap: 3px; }
    .calendar-day { min-height: 46px; justify-items: center; align-content: center; gap: 3px; padding: 5px 2px; }
    .calendar-day-events { display: none; }
    .calendar-dot { display: block; width: 5px; height: 5px; border-radius: 50%; background: #dd7959; }
    .calendar-weekday { font-size: 9px; letter-spacing: .04em; }
    .view-toggle { width: 100%; justify-content: stretch; }
    .view-toggle button { flex: 1; }
  }
`;

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, NgTemplateOutlet],
  styles: [pageStyles, calendarStyles],
  template: `
    <main class="route-shell">
      <header class="route-banner">
        <p class="eyebrow">PLAN TOGETHER</p>
        <h1>Calendar</h1>
        <p class="route-copy">Keep apartment events in one shared place.</p>
      </header>

      <div class="view-toggle" role="group" aria-label="Calendar view">
        <button
          type="button"
          [class.selected]="viewMode() === 'CALENDAR'"
          [attr.aria-pressed]="viewMode() === 'CALENDAR'"
          (click)="viewMode.set('CALENDAR')"
        >
          Calendar
        </button>
        <button
          type="button"
          [class.selected]="viewMode() === 'LIST'"
          [attr.aria-pressed]="viewMode() === 'LIST'"
          (click)="viewMode.set('LIST')"
        >
          List
        </button>
      </div>

      @if (viewMode() === 'CALENDAR') {
        <section class="calendar" aria-label="Month view">
          <div class="calendar-bar">
            <button class="secondary" type="button" aria-label="Previous month" (click)="previousMonth()">
              ‹
            </button>
            <div class="calendar-title">
              <strong>{{ monthLabel() }}</strong>
              @if (!isCurrentMonth()) {
                <button class="ghost" type="button" (click)="goToToday()">Today</button>
              }
            </div>
            <button class="secondary" type="button" aria-label="Next month" (click)="nextMonth()">
              ›
            </button>
          </div>

          <div class="calendar-grid" role="grid">
            @for (weekday of weekdayLabels; track weekday) {
              <div class="calendar-weekday" role="columnheader">{{ weekday }}</div>
            }
            @for (week of calendarWeeks(); track week[0].key) {
              @for (day of week; track day.key) {
                <button
                  type="button"
                  role="gridcell"
                  class="calendar-day"
                  [class.outside]="!day.inCurrentMonth"
                  [class.today]="day.isToday"
                  [class.selected]="day.key === selectedDay()"
                  [class.has-events]="day.events.length > 0"
                  [attr.aria-label]="day.label + ', ' + day.events.length + ' events'"
                  (click)="selectDay(day.key)"
                >
                  <span class="calendar-day-number">{{ day.dayNumber }}</span>
                  @if (day.events.length) {
                    <span class="calendar-day-events">
                      @for (event of day.events.slice(0, 2); track event.id) {
                        <span class="calendar-chip">{{ event.title }}</span>
                      }
                      @if (day.events.length > 2) {
                        <span class="calendar-more">+{{ day.events.length - 2 }}</span>
                      }
                    </span>
                    <span class="calendar-dot" aria-hidden="true"></span>
                  }
                </button>
              }
            }
          </div>

          <div class="calendar-selection">
            <h2>{{ selectedDayLabel() }}</h2>
            @for (event of selectedDayEvents(); track event.id) {
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
                  <small>
                    Created by {{ event.creatorName || 'Unknown' }}
                    @if (event.assigneeName) {
                      · Assigned to {{ event.assigneeName }}
                    }
                  </small>
                </div>
                @if (event.creatorId === dashboard.currentUser()?.id) {
                  <div class="item-actions">
                    <button class="secondary" (click)="startEdit(event)" type="button">Edit</button>
                    <button class="danger" (click)="remove(event)" type="button">Delete</button>
                  </div>
                }
              </article>
              @if (editingId() === event.id) {
                <ng-container [ngTemplateOutlet]="editForm" [ngTemplateOutletContext]="{ $implicit: event }" />
              }
            } @empty {
              <p class="empty">No events on this day.</p>
            }
          </div>
        </section>
      }

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
          <label
            >Assigned to<select [(ngModel)]="assigneeId" name="assigneeId">
              <option value="">Nobody in particular</option>
              @for (roommate of roommates(); track roommate.userId) {
                <option [value]="roommate.userId">{{ roommate.name }}</option>
              }
            </select></label
          >
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

      @if (viewMode() === 'LIST') {
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
                <small>
                  Created by {{ event.creatorName || 'Unknown' }}
                  @if (event.assigneeName) {
                    · Assigned to {{ event.assigneeName }}
                  }
                </small>
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
              <ng-container [ngTemplateOutlet]="editForm" [ngTemplateOutletContext]="{ $implicit: event }" />
            }
          } @empty {
            @if (!loading()) {
              <p class="empty">No events in this view yet.</p>
            }
          }
        </section>
      }

      <ng-template #editForm let-event>
        <form class="inline-form" (ngSubmit)="saveEdit(event)">
          <div class="grid-2">
            <label class="full">Title<input [(ngModel)]="editTitle" name="editTitle" required /></label>
            <label>Starts<input [(ngModel)]="editStartTime" name="editStartTime" type="datetime-local" required /></label>
            <label>Ends<input [(ngModel)]="editEndTime" name="editEndTime" type="datetime-local" /></label>
            <label>Location<input [(ngModel)]="editLocation" name="editLocation" /></label>
            <label
              >Assigned to<select [(ngModel)]="editAssigneeId" name="editAssigneeId">
                <option value="">Nobody in particular</option>
                @for (roommate of roommates(); track roommate.userId) {
                  <option [value]="roommate.userId">{{ roommate.name }}</option>
                }
              </select></label
            >
            <label class="full">Description<textarea [(ngModel)]="editDescription" name="editDescription"></textarea></label>
          </div>
          <div class="item-actions">
            <button type="submit" [disabled]="saving()">Save changes</button>
            <button class="secondary" type="button" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      </ng-template>
    </main>
  `,
})
export class CalendarComponent implements OnInit {
  protected readonly dashboard = inject(DashboardService);
  readonly events = signal<EventItem[]>([]);
  readonly roommates = signal<RoommatePresence[]>([]);
  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly filter = signal<'UPCOMING' | 'PAST' | 'ALL'>('UPCOMING');
  readonly viewMode = signal<'CALENDAR' | 'LIST'>('CALENDAR');
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

  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  /** First day of the month currently shown in the grid. */
  readonly monthCursor = signal(startOfMonth(new Date()));
  readonly selectedDay = signal(toDayKey(new Date()));

  /** Events bucketed by their local calendar date, as returned by the API. */
  private readonly eventsByDay = computed(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of this.events()) {
      const key = event.date || (event.startTime ? event.startTime.slice(0, 10) : '');
      if (!key) {
        continue;
      }
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(event);
      } else {
        map.set(key, [event]);
      }
    }
    return map;
  });

  readonly calendarWeeks = computed(() => {
    const cursor = this.monthCursor();
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const todayKey = toDayKey(new Date());
    const byDay = this.eventsByDay();

    // Monday-first grid: back up to the Monday on or before the 1st.
    const leadingOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const weeks: CalendarDay[][] = [];

    for (let week = 0; week < 6; week++) {
      const days: CalendarDay[] = [];
      for (let weekday = 0; weekday < 7; weekday++) {
        const date = new Date(year, month, 1 - leadingOffset + week * 7 + weekday);
        const key = toDayKey(date);
        days.push({
          key,
          dayNumber: date.getDate(),
          label: date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
          inCurrentMonth: date.getMonth() === month,
          isToday: key === todayKey,
          events: byDay.get(key) ?? [],
        });
      }
      // Drop a trailing week that belongs entirely to the next month.
      if (week === 5 && days.every((day) => !day.inCurrentMonth)) {
        break;
      }
      weeks.push(days);
    }
    return weeks;
  });

  readonly monthLabel = computed(() =>
    this.monthCursor().toLocaleDateString([], { month: 'long', year: 'numeric' }),
  );
  readonly isCurrentMonth = computed(() => {
    const now = startOfMonth(new Date());
    const cursor = this.monthCursor();
    return now.getFullYear() === cursor.getFullYear() && now.getMonth() === cursor.getMonth();
  });
  readonly selectedDayEvents = computed(() => this.eventsByDay().get(this.selectedDay()) ?? []);
  readonly selectedDayLabel = computed(() => {
    const [year, month, day] = this.selectedDay().split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  title = '';
  startTime = '';
  endTime = '';
  location = '';
  description = '';
  assigneeId = '';

  editTitle = '';
  editStartTime = '';
  editEndTime = '';
  editLocation = '';
  editDescription = '';
  editAssigneeId = '';

  ngOnInit(): void {
    if (!this.dashboard.currentUser()) {
      this.dashboard.loadCurrentUser();
    }
    this.load();
    this.loadRoommates();
  }

  selectDay(key: string): void {
    this.selectedDay.set(key);
  }

  previousMonth(): void {
    this.shiftMonth(-1);
  }

  nextMonth(): void {
    this.shiftMonth(1);
  }

  goToToday(): void {
    this.monthCursor.set(startOfMonth(new Date()));
    this.selectedDay.set(toDayKey(new Date()));
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
        assigneeId: this.assigneeId || undefined,
      })
      .subscribe({
        next: (event) => {
          this.events.update((items) => this.sortEvents([event, ...items]));
          this.title = '';
          this.startTime = '';
          this.endTime = '';
          this.location = '';
          this.description = '';
          this.assigneeId = '';
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
    this.editAssigneeId = event.assigneeId ?? '';
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
        assigneeId: this.editAssigneeId || null,
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

  private shiftMonth(delta: number): void {
    const cursor = this.monthCursor();
    this.monthCursor.set(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
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

  private loadRoommates(): void {
    this.dashboard.listPresence().subscribe({
      next: (items) => this.roommates.set(items),
      error: () => this.error.set('Unable to load roommates for assignment.'),
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
          ><label
            >Assigned to<select [(ngModel)]="assigneeId" name="assigneeId">
              <option value="">Anyone</option>
              @for (roommate of roommates(); track roommate.userId) {
                <option [value]="roommate.userId">{{ roommate.name }}</option>
              }
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
                >{{ item.quantity || 'No quantity' }} · Added by
                {{ item.addedByName || 'Unknown' }} · {{ formatDateTime(item.createdAt) }}</small
              >
              @if (item.assigneeName) {
                <small>Assigned to {{ item.assigneeName }}</small>
              }
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
                <label
                  >Category<select [(ngModel)]="editCategory" name="editCategory">
                    <option value="FOOD">Food</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="BATHROOM">Bathroom</option>
                    <option value="HOUSEHOLD">Household</option>
                    <option value="OTHER">Other</option>
                  </select></label
                >
                <label
                  >Assigned to<select [(ngModel)]="editAssigneeId" name="editAssigneeId">
                    <option value="">Anyone</option>
                    @for (roommate of roommates(); track roommate.userId) {
                      <option [value]="roommate.userId">{{ roommate.name }}</option>
                    }
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
  readonly roommates = signal<RoommatePresence[]>([]);

  name = '';
  quantity = '';
  category: ShoppingCategory = 'FOOD';
  assigneeId = '';
  editName = '';
  editQuantity = '';
  editCategory: ShoppingCategory = 'FOOD';
  editAssigneeId = '';

  ngOnInit(): void {
    this.load();
    this.loadRoommates();
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
        assigneeId: this.assigneeId || undefined,
      })
      .subscribe({
        next: (item) => {
          this.items.update((items) => this.applyFiltersAndSort([item, ...items]));
          this.name = '';
          this.quantity = '';
          this.category = 'FOOD';
          this.assigneeId = '';
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
    this.editAssigneeId = item.assigneeId ?? '';
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
        assigneeId: this.editAssigneeId || null,
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

  private loadRoommates(): void {
    this.service.listPresence().subscribe({
      next: (items) => this.roommates.set(items),
      error: () => this.error.set('Unable to load roommates for assignment.'),
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
              @for (option of statusOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
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
  readonly statusOptions = PRESENCE_STATUS_OPTIONS;
  status: PresenceStatusValue = 'HOME';
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
    return presenceStatusShortLabel(value);
  }

  statusClass(value: string): string {
    return presenceStatusClass(value);
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
          this.status = normalizePresenceStatus(mine.status);
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
              [ngModel]="wifiPasswordInput()"
              (ngModelChange)="onWifiPasswordInput($event)"
              [type]="showWifiPassword() ? 'text' : 'password'"
              name="wifiPassword"
              autocomplete="off"
              [placeholder]="wifiPasswordPlaceholder()"
          /></label>
          <label class="full wifi-actions">
            <span class="wifi-actions-row">
              <button class="secondary" type="button" (click)="toggleWifiPassword()">
                {{
                  showWifiPassword()
                    ? 'Hide password'
                    : apartment.hasWifiPassword
                      ? 'Reveal saved password'
                      : 'Show while typing'
                }}
              </button>
              @if (apartment.hasWifiPassword && !removingWifiPassword()) {
                <button class="danger" type="button" (click)="removeWifiPassword()">
                  Remove saved password
                </button>
              }
            </span>
            @if (removingWifiPassword()) {
              <small class="wifi-hint warning"
                >The saved Wi-Fi password will be removed when you save.</small
              >
            } @else if (wifiPasswordDirty()) {
              <small class="wifi-hint">The Wi-Fi password will be replaced when you save.</small>
            } @else if (apartment.hasWifiPassword) {
              <small class="wifi-hint">A password is saved. It stays unchanged unless you edit it.</small>
            } @else {
              <small class="wifi-hint">No Wi-Fi password saved yet.</small>
            }
          </label>
          <label
            >Landlord contact<input
              [(ngModel)]="apartment.landlordContact"
              name="landlordContact" /></label
          ><label
            >Emergency contact<input
              [(ngModel)]="apartment.emergencyContact"
              name="emergencyContact" /></label
          ><label class="full"
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

  /**
   * The password field is intentionally kept out of `apartment`. The apartment
   * GET never returns the plaintext password, so binding it to the shared model
   * used to send an empty value back and wipe the stored one. It is now only
   * sent when the user actually edited it or asked for it to be removed.
   */
  readonly wifiPasswordInput = signal('');
  readonly wifiPasswordDirty = signal(false);
  readonly removingWifiPassword = signal(false);

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

  wifiPasswordPlaceholder(): string {
    if (this.removingWifiPassword()) {
      return 'Will be removed on save';
    }
    if (this.apartment.hasWifiPassword && !this.wifiPasswordDirty()) {
      return 'Saved password hidden';
    }
    return '';
  }

  onWifiPasswordInput(value: string): void {
    this.wifiPasswordInput.set(value);
    this.wifiPasswordDirty.set(true);
    this.removingWifiPassword.set(false);
  }

  /** Revealing or hiding is display-only and never touches the stored value. */
  toggleWifiPassword(): void {
    if (this.showWifiPassword()) {
      this.showWifiPassword.set(false);
      return;
    }
    if (this.apartment.hasWifiPassword && !this.wifiPasswordDirty()) {
      this.service.revealApartmentPassword().subscribe({
        next: (response) => {
          this.wifiPasswordInput.set(response.wifiPassword ?? '');
          this.showWifiPassword.set(true);
        },
        error: () => this.error.set('Unable to reveal the Wi-Fi password.'),
      });
      return;
    }
    this.showWifiPassword.set(true);
  }

  removeWifiPassword(): void {
    if (typeof window !== 'undefined' && !window.confirm('Remove the saved Wi-Fi password?')) {
      return;
    }
    this.wifiPasswordInput.set('');
    this.wifiPasswordDirty.set(false);
    this.removingWifiPassword.set(true);
    this.showWifiPassword.set(false);
  }

  save(): void {
    this.saving.set(true);
    this.saved.set(false);
    this.error.set(null);

    const request: ApartmentUpdateRequest = {
      name: this.apartment.name,
      address: this.apartment.address ?? null,
      wifiName: this.apartment.wifiName ?? null,
      landlordContact: this.apartment.landlordContact ?? null,
      emergencyContact: this.apartment.emergencyContact ?? null,
      sharedNotes: this.apartment.sharedNotes ?? null,
    };
    // Only an explicit edit or removal sends the key at all.
    if (this.removingWifiPassword()) {
      request.wifiPassword = '';
    } else if (this.wifiPasswordDirty()) {
      request.wifiPassword = this.wifiPasswordInput();
    }

    this.service.updateApartment(request).subscribe({
      next: (apartment) => {
        this.apartment = { ...this.apartment, ...apartment };
        this.saving.set(false);
        this.saved.set(true);
        this.wifiPasswordDirty.set(false);
        this.removingWifiPassword.set(false);
        this.showWifiPassword.set(false);
        this.wifiPasswordInput.set('');
      },
      error: (response) => {
        this.saving.set(false);
        this.error.set(response?.error?.error ?? 'Unable to save apartment details.');
      },
    });
  }
}
