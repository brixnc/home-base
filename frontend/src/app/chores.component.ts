import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chore, DashboardService } from './dashboard.service';

@Component({
  selector: 'app-chores',
  imports: [FormsModule],
  template: `
    <main class="chores-page">
      <header>
        <p>HOUSE WORK</p>
        <h1>Chores</h1>
        <span>Keep the shared work visible and fair.</span>
      </header>

      <form (ngSubmit)="create()" #form="ngForm" class="new-chore">
        <input
          [(ngModel)]="title"
          name="title"
          placeholder="Add a chore"
          required
          aria-label="Chore title"
        />
        <input [(ngModel)]="dueDate" name="dueDate" type="date" aria-label="Due date" />
        <button type="submit" [disabled]="!form.valid || saving()">
          {{ saving() ? 'Adding...' : 'Add chore' }}
        </button>
      </form>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="chore-list" aria-label="Chore list">
        @for (chore of chores(); track chore.id) {
          <article>
            <span class="check" [class.done]="chore.completed"></span>
            <div>
              <strong>{{ chore.title }}</strong>
              <small
                >{{ chore.assigneeName || 'Unassigned' }}
                @if (chore.dueDate) {
                  · Due {{ chore.dueDate }}
                }
              </small>
            </div>
            <div class="actions">
              <button type="button" (click)="toggle(chore)">
                {{ chore.completed ? 'Reopen' : 'Done' }}
              </button>
              <button type="button" class="delete" (click)="remove(chore)">Delete</button>
            </div>
          </article>
        } @empty {
          <p class="empty">No chores yet. Add the first one above.</p>
        }
      </section>
    </main>
  `,
  styles: `
    .chores-page {
      max-width: 760px;
      margin: 28px auto;
      padding: 0 5% 48px;
      color: #293530;
    }
    header p {
      color: #829089;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.13em;
      margin: 0 0 8px;
    }
    h1 {
      font:
        600 32px 'Space Grotesk',
        sans-serif;
      margin: 0 0 6px;
    }
    header span {
      color: #6e7a74;
      font-size: 13px;
    }
    .new-chore {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 145px auto;
      gap: 10px;
      margin: 28px 0 16px;
    }
    input {
      border: 1px solid #d7ddd7;
      border-radius: 7px;
      background: #fbfaf6;
      padding: 11px 12px;
      font: inherit;
      color: #293530;
    }
    button {
      border: 0;
      border-radius: 7px;
      background: #25312d;
      color: #fff;
      padding: 0 16px;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .chore-list {
      display: grid;
      gap: 8px;
    }
    article {
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid #e1e5df;
      border-radius: 8px;
      background: #fbfaf6;
      padding: 14px;
    }
    article div {
      display: grid;
      gap: 4px;
      flex: 1;
    }
    small,
    .empty {
      color: #78847d;
      font-size: 12px;
    }
    .check {
      width: 13px;
      height: 13px;
      border: 2px solid #a8b2ac;
      border-radius: 50%;
    }
    .check.done {
      background: #72b98f;
      border-color: #72b98f;
    }
    .state {
      color: #c8734f;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .actions {
      display: flex;
      gap: 6px;
    }
    .actions button {
      padding: 7px 9px;
      font-size: 11px;
    }
    .actions .delete {
      background: #f8e6df;
      color: #a84f35;
    }
    .error {
      color: #b4422d;
      font-size: 13px;
    }
    @media (max-width: 640px) {
      .new-chore {
        grid-template-columns: 1fr;
      }
      button {
        padding: 11px 16px;
      }
    }
  `,
})
export class ChoresComponent implements OnInit {
  private readonly dashboard = inject(DashboardService);
  readonly chores = signal<Chore[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  title = '';
  dueDate = '';

  ngOnInit(): void {
    this.load();
  }

  create(): void {
    const title = this.title.trim();
    if (!title) return;
    this.saving.set(true);
    this.error.set(null);
    this.dashboard.createChore({ title, dueDate: this.dueDate || undefined }).subscribe({
      next: () => {
        this.title = '';
        this.dueDate = '';
        this.saving.set(false);
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Unable to add this chore. Please sign in again and retry.');
      },
    });
  }

  private load(): void {
    this.dashboard.listChores().subscribe({
      next: (chores) => this.chores.set(chores),
      error: () => this.error.set('Unable to load chores. Please sign in again.'),
    });
  }

  toggle(chore: Chore): void {
    this.dashboard.updateChore(chore.id, { completed: !chore.completed }).subscribe({
      next: () =>
        this.chores.update((items) =>
          items.map((item) =>
            item.id === chore.id ? { ...item, completed: !item.completed } : item,
          ),
        ),
      error: () => this.error.set('Unable to update this chore.'),
    });
  }

  remove(chore: Chore): void {
    this.dashboard.deleteChore(chore.id).subscribe({
      next: () => this.chores.update((items) => items.filter((item) => item.id !== chore.id)),
      error: () => this.error.set('Unable to delete this chore.'),
    });
  }
}
