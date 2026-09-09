# HomeBase

HomeBase is a small shared-apartment app for 3–8 roommates. It provides a single authenticated household workspace for dashboard updates, chores, calendar events, shopping items, roommate presence, planned absences, apartment feed posts, notifications, and apartment settings.

## Architecture

- `frontend/` — Angular 22 SPA with route guards, Keycloak authentication, and responsive household pages
- `backend/` — Spring Boot 3.5 REST API with JWT validation, service-layer business logic, and Flyway migrations
- `infrastructure/keycloak/` — imported local Keycloak realm with seeded test users
- `docker-compose.yml` — local PostgreSQL 16 and Keycloak 26 services

## Main features

- Dashboard with live backend summaries for presence, chores, events, shopping, and notifications
- Roommate presence updates with consistent statuses: `HOME`, `AWAY`, `WORK`, `SCHOOL`, `TRAVELING`
- Chores CRUD with assignment, due dates, description, priority, filters, and sorting
- Calendar event CRUD with creator ownership checks
- Shopping item CRUD with categories, purchased state, filters, and sorting
- Roommates page with notes, expected return times, and planned absence CRUD
- Activity feed posts with create/list/delete-own support
- Notifications with unread badge, mark-one-read, and mark-all-read
- Apartment settings with deliberate Wi-Fi password reveal instead of broad exposure
- Protected client-side routing plus an authenticated 404 page

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

## Authentication

- Realm: `homebase`
- Client: `homebase-web`
- Issuer: `http://localhost:8081/realms/homebase`

The frontend authenticates with Keycloak and sends bearer tokens to the Spring Boot API. All `/api/**` endpoints require authentication. Ownership-sensitive actions use the authenticated JWT identity rather than trusting user IDs from the client.

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

If `./mvnw` is unavailable in your environment, use your installed Maven:

```bash
cd backend
mvn spring-boot:run
```

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

### Shopping

- `GET /api/shopping`
- `POST /api/shopping`
- `PUT /api/shopping/{id}`
- `DELETE /api/shopping/{id}`

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

Recent schema additions include:

- chore priority support
- absence/feed-post exposure support aligned with the existing schema

## Testing commands

### Backend

```bash
cd backend
mvn clean test
```

### Frontend unit tests

```bash
cd frontend
npm test -- --runInBand
```

### Frontend production build

```bash
cd frontend
npm run build
```

## Troubleshooting

- **Backend fails with `release version 21 not supported`**  
  Install Java 21 and ensure `JAVA_HOME` points to it before running Maven.

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
