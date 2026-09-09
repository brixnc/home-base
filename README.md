# homebase

HomeBase is a local apartment dashboard for shared household planning. The repository uses Angular for the browser app, Spring Boot for the authenticated API, PostgreSQL for persistence, and Keycloak for identity.

## Project structure

- `frontend/` Angular 22 SPA
- `backend/` Spring Boot REST API with JWT validation and Flyway
- `infrastructure/keycloak/` imported local Keycloak realm
- `docker-compose.yml` local Postgres + Keycloak

## Required tools

- Node.js 22+
- Java 21+
- Docker Desktop with Compose
- Maven 3.9+

## Windows commands to run the project

From the repository root in PowerShell or Command Prompt:

```powershell
docker compose up -d
cd backend
"C:\Program Files\JetBrains\IntelliJ IDEA 2024.2.2\plugins\maven\lib\maven3\bin\mvn.cmd" spring-boot:run
```

Then in a second terminal:

```powershell
cd frontend
npm install
npm start
```

Open the app at:

- Angular: http://localhost:4201
- Backend: http://localhost:8082
- Keycloak: http://localhost:8081
- PostgreSQL: localhost:5433

## Local auth and users

The Keycloak realm is `homebase` and the SPA client is `homebase-web`.

| Username | Password | Display name |
| --- | --- | --- |
| `brian` | `brian123` | Brian Parker |
| `alex` | `alex123` | Alex Morgan |
| `sam` | `sam123` | Sam Lee |

## Key API endpoints

- `GET /actuator/health`
- `GET /api/users/me`
- `GET /api/dashboard`
- `GET /api/presence`
- `GET /api/chores`
- `GET /api/events`
- `GET /api/shopping`
- `GET /api/notifications`
- `GET /api/apartment`

All other `/api/**` routes require a valid bearer token from the `homebase` realm.

## Notes

- The dashboard is backed by real database records through the Spring API.
- The frontend uses the authenticated API rather than mock local state.
- The app intentionally keeps the navigation simple: dashboard, calendar, chores, shopping, roommates, and settings.

## Cleanup

```powershell
docker compose down
```

To reset the local database too:

```powershell
docker compose down -v
```
