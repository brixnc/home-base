import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chore, ChorePriority, DashboardService, RoommatePresence } from './dashboard.service';

type ChoreFilter = 'ALL' | 'MINE' | 'OPEN' | 'COMPLETED' | 'OVERDUE';
type ChoreSort = 'DUE_DATE' | 'PRIORITY' | 'ASSIGNEE';

@Component({
  selector: 'app-chores',
  imports: [FormsModule],
  template: `
    <main class="chores-page">
      <header>
        <p>HOUSE WORK</p>
        <h1>Chores</h1>
        <span>Track open work, assignments, and deadlines in one place.</span>
      </header>

      <section class="controls">
        <label>
          Filter
          <select [ngModel]="filter()" (ngModelChange)="filter.set($event)" name="filter">
            <option value="ALL">All</option>
            <option value="MINE">My chores</option>
            <option value="OPEN">Open</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </label>
        <label>
          Sort
          <select [ngModel]="sort()" (ngModelChange)="sort.set($event)" name="sort">
            <option value="DUE_DATE">Due date</option>
            <option value="PRIORITY">Priority</option>
            <option value="ASSIGNEE">Assignee</option>
          </select>
        </label>
      </section>

      <form (ngSubmit)="create()" #form="ngForm" class="editor-card">
        <h2>Add chore</h2>
        <div class="editor-grid">
          <label>
            Title
            <input
              [(ngModel)]="title"
              name="title"
              placeholder="Take out recycling"
              required
              aria-label="Chore title"
            />
          </label>
          <label>
            Due date
            <input [(ngModel)]="dueDate" name="dueDate" type="date" aria-label="Due date" />
          </label>
          <label>
            Assignee
            <select [(ngModel)]="assigneeId" name="assigneeId">
              <option value="">Unassigned</option>
              @for (roommate of roommates(); track roommate.userId) {
                <option [value]="roommate.userId">{{ roommate.name }}</option>
              }
            </select>
          </label>
          <label>
            Priority
            <select [(ngModel)]="priority" name="priority">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label class="wide">
            Description
            <textarea
              [(ngModel)]="description"
              name="description"
              placeholder="Optional details"
            ></textarea>
          </label>
        </div>
        <button type="submit" [disabled]="!form.valid || saving()">
          {{ saving() ? 'Saving...' : 'Add chore' }}
        </button>
      </form>

      @if (message()) {
        <p class="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
      @if (loading()) {
        <p class="empty">Loading chores…</p>
      }

      <section class="chore-list" aria-label="Chore list">
        @for (chore of visibleChores(); track chore.id) {
          <article>
            <span class="check" [class.done]="chore.completed"></span>
            <div class="details">
              <div class="title-row">
                <strong>{{ chore.title }}</strong>
                <span class="priority" [class.high]="chore.priority === 'HIGH'">{{
                  chore.priority
                }}</span>
                @if (chore.overdue) {
                  <span class="flag overdue">OVERDUE</span>
                } @else if (chore.dueToday) {
                  <span class="flag today">TODAY</span>
                }
              </div>
              <small>
                {{ chore.assigneeName || 'Unassigned' }}
                @if (chore.dueDate) {
                  · Due {{ formatDate(chore.dueDate) }}
                }
              </small>
              @if (chore.description) {
                <p>{{ chore.description }}</p>
              }
            </div>
            <div class="actions">
              <button type="button" (click)="toggle(chore)">
                {{ chore.completed ? 'Reopen' : 'Done' }}
              </button>
              <button type="button" class="secondary" (click)="startEdit(chore)">Edit</button>
              <button type="button" class="delete" (click)="remove(chore)">Delete</button>
            </div>
          </article>
          @if (editingId() === chore.id) {
            <form class="editor-card edit-card" (ngSubmit)="saveEdit(chore)">
              <h3>Edit chore</h3>
              <div class="editor-grid">
                <label>
                  Title
                  <input [(ngModel)]="editTitle" name="editTitle" required />
                </label>
                <label>
                  Due date
                  <input [(ngModel)]="editDueDate" name="editDueDate" type="date" />
                </label>
                <label>
                  Assignee
                  <select [(ngModel)]="editAssigneeId" name="editAssigneeId">
                    <option value="">Unassigned</option>
                    @for (roommate of roommates(); track roommate.userId) {
                      <option [value]="roommate.userId">{{ roommate.name }}</option>
                    }
                  </select>
                </label>
                <label>
                  Priority
                  <select [(ngModel)]="editPriority" name="editPriority">
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                  </select>
                </label>
                <label class="wide">
                  Description
                  <textarea [(ngModel)]="editDescription" name="editDescription"></textarea>
                </label>
              </div>
              <div class="edit-actions">
                <button type="submit" [disabled]="saving()">Save changes</button>
                <button type="button" class="secondary" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          }
        } @empty {
          @if (!loading()) {
            <p class="empty">No chores match the current filter.</p>
          }
        }
      </section>
    </main>
  `,
  styles: `
    .chores-page {
      max-width: 960px;
      margin: 28px auto;
      padding: 0 5% 48px;
      color: #293530;
    }
    header p, .controls label, .editor-card h2, .editor-card h3 {
      color: #829089;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.13em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }
    h1 {
      font: 600 32px 'Space Grotesk', sans-serif;
      margin: 0 0 6px;
    }
    header span, small, .empty, .error, .status, p {
      color: #6e7a74;
      font-size: 13px;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 28px 0 16px;
    }
    .controls label, .editor-grid label {
      display: grid;
      gap: 6px;
      font-size: 11px;
    }
    select, input, textarea {
      border: 1px solid #d7ddd7;
      border-radius: 7px;
      background: #fbfaf6;
      padding: 11px 12px;
      font: inherit;
      color: #293530;
    }
    textarea {
      min-height: 96px;
      resize: vertical;
    }
    .editor-card {
      border: 1px solid #e1e5df;
      border-radius: 12px;
      background: #fff;
      padding: 18px;
      margin-bottom: 18px;
    }
    .editor-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }
    .editor-grid .wide {
      grid-column: 1 / -1;
    }
    button {
      border: 0;
      border-radius: 7px;
      background: #25312d;
      color: #fff;
      padding: 10px 16px;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    button.secondary {
      background: #e9eee9;
      color: #405048;
    }
    .delete {
      background: #f8e6df;
      color: #a84f35;
    }
    .error {
      color: #b4422d;
    }
    .status {
      color: #57906e;
      font-weight: 600;
    }
    .chore-list {
      display: grid;
      gap: 10px;
    }
    article {
      display: flex;
      align-items: start;
      gap: 12px;
      border: 1px solid #e1e5df;
      border-radius: 12px;
      background: #fbfaf6;
      padding: 14px;
    }
    .details {
      display: grid;
      gap: 5px;
      flex: 1;
    }
    .title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .details p {
      margin: 0;
    }
    .check {
      width: 13px;
      height: 13px;
      border: 2px solid #a8b2ac;
      border-radius: 50%;
      margin-top: 5px;
    }
    .check.done {
      background: #72b98f;
      border-color: #72b98f;
    }
    .priority, .flag {
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .priority {
      background: #edf0ec;
      color: #405048;
    }
    .priority.high {
      background: #fbe7df;
      color: #a84f35;
    }
    .flag.overdue {
      background: #fde8e2;
      color: #b4422d;
    }
    .flag.today {
      background: #edf5ee;
      color: #57906e;
    }
    .actions, .edit-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .actions {
      justify-content: end;
    }
    .edit-card {
      margin: -2px 0 4px 0;
    }
    @media (max-width: 720px) {
      .chores-page {
        padding: 0 16px 35px;
      }
      .editor-grid {
        grid-template-columns: 1fr;
      }
      article {
        display: grid;
      }
      .actions {
        justify-content: start;
      }
    }
  `,
})
export class ChoresComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  readonly chores = signal<Chore[]>([]);
  readonly roommates = signal<RoommatePresence[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly filter = signal<ChoreFilter>('ALL');
  readonly sort = signal<ChoreSort>('DUE_DATE');
  readonly visibleChores = computed(() => this.sortChores(this.filterChores(this.chores())));

  title = '';
  description = '';
  dueDate = '';
  assigneeId = '';
  priority: ChorePriority = 'NORMAL';

  editTitle = '';
  editDescription = '';
  editDueDate = '';
  editAssigneeId = '';
  editPriority: ChorePriority = 'NORMAL';

  ngOnInit(): void {
    if (!this.dashboard.currentUser()) {
      this.dashboard.loadCurrentUser();
    }
    this.load();
    this.loadRoommates();
  }

  create(): void {
    const title = this.title.trim();
    if (!title) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);
    this.dashboard
      .createChore({
        title,
        description: this.description || undefined,
        dueDate: this.dueDate || undefined,
        assigneeId: this.assigneeId || undefined,
        priority: this.priority,
      })
      .subscribe({
        next: (chore) => {
          this.chores.update((items) => this.sortChores([chore, ...items]));
          this.resetCreateForm();
          this.saving.set(false);
          this.message.set('Chore added.');
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Unable to add this chore. Please retry.');
        },
      });
  }

  toggle(chore: Chore): void {
    this.saving.set(true);
    this.error.set(null);
    this.dashboard.updateChore(chore.id, { completed: !chore.completed }).subscribe({
      next: (updated) => {
        this.replaceChore(updated);
        this.saving.set(false);
        this.message.set(updated.completed ? 'Chore marked complete.' : 'Chore reopened.');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Unable to update this chore.');
      },
    });
  }

  startEdit(chore: Chore): void {
    this.editingId.set(chore.id);
    this.editTitle = chore.title;
    this.editDescription = chore.description ?? '';
    this.editDueDate = chore.dueDate ?? '';
    this.editAssigneeId = chore.assigneeId ?? '';
    this.editPriority = chore.priority ?? 'NORMAL';
    this.error.set(null);
    this.message.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(chore: Chore): void {
    this.saving.set(true);
    this.error.set(null);
    this.dashboard
      .updateChore(chore.id, {
        title: this.editTitle.trim(),
        description: this.editDescription || null,
        dueDate: this.editDueDate || null,
        assigneeId: this.editAssigneeId || null,
        priority: this.editPriority,
      })
      .subscribe({
        next: (updated) => {
          this.replaceChore(updated);
          this.saving.set(false);
          this.editingId.set(null);
          this.message.set('Chore updated.');
        },
        error: () => {
          this.saving.set(false);
          this.error.set('Unable to save this chore.');
        },
      });
  }

  remove(chore: Chore): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${chore.title}"?`)) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.dashboard.deleteChore(chore.id).subscribe({
      next: () => {
        this.chores.update((items) => items.filter((item) => item.id !== chore.id));
        this.saving.set(false);
        this.message.set('Chore deleted.');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Unable to delete this chore.');
      },
    });
  }

  formatDate(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboard.listChores().subscribe({
      next: (chores) => {
        this.chores.set(this.sortChores(chores));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load chores. Please sign in again.');
      },
    });
  }

  private loadRoommates(): void {
    this.dashboard.listPresence().subscribe({
      next: (items) => this.roommates.set(items),
      error: () => this.error.set('Unable to load roommates for assignments.'),
    });
  }

  private filterChores(items: Chore[]): Chore[] {
    const currentUserId = this.dashboard.currentUser()?.id;
    switch (this.filter()) {
      case 'MINE':
        return items.filter((item) => item.assigneeId === currentUserId);
      case 'OPEN':
        return items.filter((item) => !item.completed);
      case 'COMPLETED':
        return items.filter((item) => item.completed);
      case 'OVERDUE':
        return items.filter((item) => Boolean(item.overdue));
      default:
        return items;
    }
  }

  private sortChores(items: Chore[]): Chore[] {
    return [...items].sort((left, right) => {
      switch (this.sort()) {
        case 'PRIORITY':
          return this.priorityRank(right.priority) - this.priorityRank(left.priority);
        case 'ASSIGNEE':
          return (left.assigneeName ?? '').localeCompare(right.assigneeName ?? '');
        default:
          return (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31');
      }
    });
  }

  private priorityRank(priority: ChorePriority): number {
    switch (priority) {
      case 'HIGH':
        return 3;
      case 'NORMAL':
        return 2;
      default:
        return 1;
    }
  }

  private replaceChore(chore: Chore): void {
    this.chores.update((items) =>
      this.sortChores(items.map((item) => (item.id === chore.id ? chore : item))),
    );
  }

  private resetCreateForm(): void {
    this.title = '';
    this.description = '';
    this.dueDate = '';
    this.assigneeId = '';
    this.priority = 'NORMAL';
  }
}
