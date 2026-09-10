# HomeBase

HomeBase is a small shared-apartment app for 3–8 roommates. It provides a single authenticated household workspace for dashboard updates, chores, calendar events, shopping items, roommate presence, planned absences, apartment feed posts, notifications, and apartment settings.

## Architecture

- `frontend/` — Angular 22 SPA with route guards, Keycloak authentication, and responsive household pages
- `backend/` — Spring Boot 3.5 REST API with JWT validation, service-layer business logic, and Flyway migrations
- `infrastructure/keycloak/` — imported local Keycloak realm with seeded test users
- `docker-compose.yml` — local PostgreSQL 16 and Keycloak 26 services

## Main features

- Dashboard with live backend summaries for presence, chores, events, shopping, planned absences, and notifications
- Explicit presence status picker using the canonical statuses: `HOME`, `AWAY`, `AT_WORK`, `AT_SCHOOL`, `TRAVELING`, `DO_NOT_DISTURB`
- Chores CRUD with assignment, due dates, description, priority, filters, and sorting
- Calendar with a month grid **and** the event list behind a view toggle, plus event CRUD with creator ownership checks and an optional assigned roommate
- Shopping item CRUD with categories, purchased state, an optional assigned roommate, filters, and sorting
- Roommates page with notes, expected return times, and planned absence CRUD
- Activity feed posts with create/list/delete-own support
- Notifications with unread badge, mark-one-read, and mark-all-read
- Apartment settings with deliberate Wi-Fi password reveal instead of broad exposure
- Protected client-side routing plus an authenticated 404 page
- Responsive shell: sidebar on desktop, bottom navigation with a "More" sheet on phones

## Stack

- Angular
- TypeScript
- Spring Boot
- Spring Security OAuth2 Resource Server
- PostgreSQL
- Flyway
- Keycloak
- Docker Compose

## Default local ports

- Frontend: `http://localhost:4201`
- Backend API: `http://localhost:8082`
- Keycloak: `http://localhost:8081`
- PostgreSQL: `localhost:5433`

## Presence status contract

The backend, the database `presence_status_allowed` constraint and the API all use
the same canonical values:

`HOME`, `AWAY`, `AT_WORK`, `AT_SCHOOL`, `TRAVELING`, `DO_NOT_DISTURB`

The API returns these values unchanged. Friendly labels ("At work") are a purely
presentational concern and live in one place on the frontend,
`frontend/src/app/presence-status.ts`. Writes still accept the legacy `WORK` and
`SCHOOL` shorthand for compatibility, and normalise it to the canonical value.

## Wi-Fi password handling

- `GET /api/apartment` **never** returns the plaintext password, only `hasWifiPassword`
- `GET /api/apartment/password` returns it, and only on a deliberate reveal
- `PUT /api/apartment` treats the `wifiPassword` field as follows:
  - key absent -> stored password unchanged
  - value `null` -> stored password unchanged
  - value `""` -> explicit removal
  - value `"secret"` -> explicit replacement

The settings form therefore only sends `wifiPassword` when the user actually edited
the field or pressed "Remove saved password". Revealing or hiding the password is
display-only and never changes what is stored.

## Authentication

- Realm: `homebase`
- Client: `homebase-web`
- Issuer: `http://localhost:8081/realms/homebase`

The frontend authenticates with Keycloak and sends bearer tokens to the Spring Boot API. All `/api/**` endpoints require authentication. Ownership-sensitive actions use the authenticated JWT identity rather than trusting user IDs from the client.

The access token is refreshed proactively, scheduled from the token's own `exp`
claim (with Keycloak's `onTokenExpired` as a backstop), so a normal expiry never
logs anyone out. A `401` makes the HTTP interceptor try one refresh and replay the
request; only a genuine refresh failure ends the session.

Keycloak returns to whichever URL the user opened, so deep links such as
`http://localhost:4201/chores` and hard refreshes stay on that page.

## Test users

| Username | Password | Display name |
| --- | --- | --- |
| `brian` | `brian123` | Brian Parker |
| `alex` | `alex123` | Alex Morgan |
| `sam` | `sam123` | Sam Lee |
| `enrico` | `enrico123` | Enrico Homebase |
| `seraina` | `seraina123` | Seraina Homebase |

## Startup

From the repository root:

### 1. Start infrastructure

```bash
docker compose up -d
```

### 2. Start the backend

Java 21 is required.

```bash
cd backend
./mvnw spring-boot:run
```

The Maven wrapper is committed, so no local Maven install is required. On Windows
`cmd`/PowerShell use `mvnw.cmd` instead of `./mvnw`.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run serve:frontend
```

### 4. Open the app

Open `http://localhost:4201` and sign in with one of the test users above.

## Shutdown

Stop local infrastructure:

```bash
docker compose down
```

Remove the database volume too:

```bash
docker compose down -v
```

## Backend API overview

### Current user and dashboard

- `GET /api/users/me`
- `GET /api/dashboard`

### Presence

- `GET /api/presence`
- `PUT /api/presence/me`

### Chores

- `GET /api/chores`
- `POST /api/chores`
- `PUT /api/chores/{id}`
- `DELETE /api/chores/{id}`

### Events

- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/{id}`
- `DELETE /api/events/{id}`

Events accept an optional `assigneeId`. Edit and delete remain creator-only.

### Shopping

- `GET /api/shopping`
- `POST /api/shopping`
- `PUT /api/shopping/{id}`
- `DELETE /api/shopping/{id}`

Shopping items accept an optional `assigneeId`, kept separate from the existing
`addedBy` attribution.

### Notifications

- `GET /api/notifications`
- `PUT /api/notifications/{id}/read`
- `PUT /api/notifications/read-all`

### Apartment settings

- `GET /api/apartment`
- `PUT /api/apartment`
- `GET /api/apartment/password`

### Planned absences

- `GET /api/absences`
- `POST /api/absences`
- `PUT /api/absences/{id}`
- `DELETE /api/absences/{id}`

### Feed posts

- `GET /api/feed-posts`
- `POST /api/feed-posts`
- `DELETE /api/feed-posts/{id}`

### Health

- `GET /actuator/health`

## Database

- PostgreSQL runs in Docker on port `5433`
- Spring Boot uses Flyway migrations from `backend/src/main/resources/db/migration`
- Hibernate schema auto-creation is disabled; schema changes must go through Flyway

Migrations:

- `V1` initial schema
- `V2` apartment info, notifications, chore description/completed columns
- `V3` chore priority constraint
- `V4` optional `assignee_id` on `events` and `shopping_items` (both nullable, so
  existing rows are untouched) plus an index on `notifications(user_profile_id)`

## Testing commands

### Backend

```bash
cd backend
./mvnw clean test
```

### Frontend unit tests

```bash
cd frontend
npm test
```

### Frontend production build

```bash
cd frontend
npm run build
```

## Troubleshooting

- **Backend fails with `release version 21 not supported`**  
  Install Java 21 or newer and ensure `JAVA_HOME` points to it before running Maven.
  The project targets Java 21; newer JDKs (tested on 25) also work.

- **Frontend cannot reach the API**  
  Confirm the backend is running on `http://localhost:8082`.

- **Login fails**  
  Confirm Keycloak is running on `http://localhost:8081`, the `homebase` realm imported successfully, and you are using one of the seeded users.

- **Database connection errors**  
  Confirm Docker is running and PostgreSQL is healthy on `localhost:5433`.

- **Clean local reset needed**  
  Run `docker compose down -v`, then `docker compose up -d` to recreate PostgreSQL and re-import the Keycloak realm.

- **Unknown routes**  
  Authenticated users should see the in-app 404 page for unknown frontend routes. Unknown backend API routes should return HTTP 404.
