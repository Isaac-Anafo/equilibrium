# Equilibrium — Backend

Spring Boot backend for the **Equilibrium** portfolio-rebalancing platform. It exposes a
REST API consumed by the React frontend in this repository and implements the domain logic
for allocation-drift monitoring, rebalancing proposals, trade execution, analytics, and
notifications.

This documentation is derived from the frontend's routes, state stores, and data shapes
(`src/state/*`, `src/data/portfolio.tsx`). It is the contract the backend must honour so the
existing frontend can be switched from its local mock state to the live API without UI changes.

---

## 1. Context

The frontend is a single-page React app with these flows:

| Frontend route | Page(s) | Backend capability required |
|---|---|---|
| `/` | Sign in | Email/password sign-in, Google SSO |
| `/forgot-password` | Forgot password | Request/reset password |
| `/onboarding/*` | Account, Portfolio, Holdings, Complete | Account creation, portfolio creation, holdings import |
| `/dashboard` | Dashboard | Portfolio summary, holdings table, drift gauge, performance chart |
| `/rebalance` | Rebalance | Current-vs-target table, proposed trades, rationale |
| `/rebalance/confirm` | Confirm trades | Execute proposed trades |
| `/analytics` | Analytics | Performance series, risk metrics, rebalance history |
| `/settings` | Settings | Target allocation, drift threshold, auto-approve, notification prefs |
| `/notifications` | Notifications | Notification list, mark-all-read |

Today the frontend seeds all of this from `src/data/portfolio.tsx` and persists it to
`localStorage` (`src/state/*`). The backend replaces that mock with a real, persistent,
multi-user service.

## 2. Architecture

```
┌─────────────────────────────┐        HTTPS / JSON        ┌────────────────────────────────────────────┐
│  React SPA (this repo)      │ ─────────────────────────▶ │  Spring Boot 3.x (com.equilibrium)          │
│  react-router · recharts    │  Authorization: Bearer JWT │                                               │
└─────────────────────────────┘                            │  ┌──────────────┐  ┌──────────────────────┐  │
                                                            │  │ Controllers  │─▶│ Services             │  │
                                                            │  │ (REST layer) │  │ (domain logic)       │  │
                                                            │  └──────────────┘  └──────────┬───────────┘  │
                                                            │                                │             │
                                                            │  ┌──────────────────────┐       ▼             │
                                                            │  │ Security (JWT + OAuth2)│   ┌───────────────┐ │
                                                            │  └──────────────────────┘   │ Repositories  │ │
                                                            │                              │ (Spring Data) │ │
                                                            │                              └───────┬───────┘ │
                                                            │                                      ▼        │
                                                            │                              ┌───────────────┐ │
                                                            │                              │ PostgreSQL 16│ │
                                                            │                              │ (+ Flyway)   │ │
                                                            │                              └───────────────┘ │
                                                            └────────────────────────────────────────────────┘
```

### Layered structure

- **Controller layer** — thin REST adapters; request/response mapping, validation, HTTP
  status codes. Never contains domain logic.
- **Service layer** — transaction boundaries and domain logic (drift calculation, rebalance
  engine, auth, notifications).
- **Repository layer** — Spring Data JPA repositories over PostgreSQL.
- **Security** — Spring Security 6 with a stateless JWT filter plus an OAuth2 login flow.

### Package layout

```
com.equilibrium
├── auth          # AuthController, AuthService, JwtService, GoogleOAuthService
├── portfolio     # Portfolio, Position, TargetAllocation; drift + target allocation
├── rebalance     # RebalanceEngine, RebalanceService, RebalanceEvent
├── analytics     # AnalyticsService, metric + performance projections
├── notification  # Notification, NotificationPreference, NotificationService
└── common        # ApiError, exception handlers, config, security filter chain
```

### Module boundaries

| Module | Owns | Depends on |
|---|---|---|
| `auth` | users, tokens, sessions | — |
| `portfolio` | portfolio, positions, target allocation | `auth` |
| `rebalance` | proposals, execution, event log | `portfolio` |
| `analytics` | performance series, risk metrics | `portfolio`, `rebalance` |
| `notification` | notifications, preferences, channels | `portfolio`, `rebalance` |

## 3. Tech stack

| Concern | Choice |
|---|---|
| Runtime | Java 21 (LTS) |
| Framework | Spring Boot 3.x (Spring Framework 6) |
| Build | Maven (`pom.xml`) |
| Security | Spring Security 6, JWT (jjwt), Spring OAuth2 Client |
| Persistence | Spring Data JPA / Hibernate, Flyway migrations |
| Database | PostgreSQL 16 |
| API docs | springdoc-openapi (Swagger UI at `/swagger-ui.html`) |
| Validation | Bean Validation (jakarta.validation) |
| Serialization | Jackson (default), `OffsetDateTime` for timestamps |

## 4. Conventions

- **Base path**: `/api/v1`
- **JSON**: `camelCase`, consistent with the frontend TypeScript interfaces.
- **Timestamps**: ISO-8601 `OffsetDateTime` (e.g. `2026-08-02T16:00:00Z`). The frontend
  renders its own "As of" label, so the backend supplies the canonical instant.
- **Currency**: numeric amounts in USD, `DECIMAL(12,2)` in storage, JSON numbers.
- **Percentages**: stored as `DECIMAL(5,1)` (e.g. `38.4` for 38.4%), JSON numbers.
- **Errors**: unified envelope — see [02-api-reference.md](02-api-reference.md#error-responses).
- **Auth**: stateless `Authorization: Bearer <JWT>`; all routes under `/api/v1` require a
  token except the explicitly public auth endpoints.

## 5. Auth model (summary)

Two sign-in paths, both issuing a JWT access token (+ rotating refresh token):

1. **Email/password** (`POST /api/v1/auth/signin`) — BCrypt-verified credentials.
2. **Google SSO** (`POST /api/v1/auth/google`) — frontend obtains a Google auth-code via the
   Authorization Code flow, backend exchanges it for user info, and links/creates a local user.

See [03-authentication.md](03-authentication.md) for the full flows and token lifecycle.

## 6. Domain model (summary)

```
users 1───1 portfolio_preferences
users 1───N portfolios
portfolios 1──N positions
portfolios 1──1 target_allocations
portfolios 1──N rebalance_events
users 1──N notifications
users 1──1 notification_preferences
users 1──N refresh_tokens
users 1──N password_reset_tokens
```

See [01-domain-model.md](01-domain-model.md) for entities and DDL.

## 7. Rebalance engine (summary)

`RebalanceEngine` computes per-position drift (`current% − target%`), classifies each into
`balanced / caution / action`, and for any position beyond the drift threshold generates a
Buy (underweight) or Sell (overweight) proposal with shares, amount, cost, and rationale.

See [04-rebalance-engine.md](04-rebalance-engine.md) for the algorithm.

## 8. API surface at a glance

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/signin` | Sign in with email/password |
| `POST` | `/api/v1/auth/signup` | Create account |
| `POST` | `/api/v1/auth/google` | Google SSO |
| `POST` | `/api/v1/auth/refresh` | Rotate access token |
| `GET` | `/api/v1/auth/me` | Current user |
| `POST` | `/api/v1/auth/forgot-password` | Request reset link |
| `POST` | `/api/v1/auth/reset-password` | Complete reset |
| `POST` | `/api/v1/portfolios` | Create portfolio (onboarding) |
| `GET` | `/api/v1/portfolios/{id}/summary` | Dashboard headline numbers |
| `GET` | `/api/v1/portfolios/{id}/holdings` | Holdings rows (drift table) |
| `GET` | `/api/v1/portfolios/{id}/target-allocation` | Read target allocation |
| `PUT` | `/api/v1/portfolios/{id}/target-allocation` | Update target allocation |
| `GET` | `/api/v1/portfolios/{id}/settings/drift-threshold` | Read threshold |
| `PUT` | `/api/v1/portfolios/{id}/settings/drift-threshold` | Update threshold |
| `GET` | `/api/v1/portfolios/{id}/settings/auto-approve` | Read auto-approve |
| `PUT` | `/api/v1/portfolios/{id}/settings/auto-approve` | Update auto-approve |
| `GET` | `/api/v1/portfolios/{id}/rebalance/proposals` | Proposed trades |
| `POST` | `/api/v1/portfolios/{id}/rebalance/execute` | Execute approved trades |
| `GET` | `/api/v1/portfolios/{id}/rebalance/log` | Rebalance history |
| `GET` | `/api/v1/portfolios/{id}/performance?range=` | Performance series |
| `GET` | `/api/v1/portfolios/{id}/metrics` | Risk metrics |
| `GET` | `/api/v1/notifications` | Notification list |
| `POST` | `/api/v1/notifications/read-all` | Mark all read |
| `GET` | `/api/v1/notifications/preferences` | Read notification prefs |
| `PUT` | `/api/v1/notifications/preferences` | Update notification prefs |

Full schemas and examples: [02-api-reference.md](02-api-reference.md).

## 9. Getting started (backend dev)

```bash
# 1. PostgreSQL 16 running locally; create the database
createdb equilibrium

# 2. Configure environment
export DB_URL=jdbc:postgresql://localhost:5432/equilibrium
export DB_USERNAME=equilibrium
export DB_PASSWORD=<secret>
export JWT_SECRET=<64-byte random base64>
export GOOGLE_CLIENT_ID=<...>
export GOOGLE_CLIENT_SECRET=<...>

# 3. Run (Flyway applies migrations on startup)
./mvnw spring-boot:run

# 4. Browse API docs
open http://localhost:8080/swagger-ui.html
```

## 10. Related documents

- [01-domain-model.md](01-domain-model.md) — entities, relationships, DDL
- [02-api-reference.md](02-api-reference.md) — REST API reference with schemas
- [03-authentication.md](03-authentication.md) — auth flows and token lifecycle
- [04-rebalance-engine.md](04-rebalance-engine.md) — drift + proposal algorithm
- [06-application-config.yml.md](06-application-config.yml.md) — annotated sample config
- [openapi.yaml](openapi.yaml) — machine-readable OpenAPI 3.0 spec
