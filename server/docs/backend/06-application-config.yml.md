# Sample `application.yml`

Annotated configuration for the Equilibrium backend. Environment-specific secrets are
externalized via `${VAR}` placeholders; never commit real values.

```yaml
# ─────────────────────────────────────────────────────────────
# Server
# ─────────────────────────────────────────────────────────────
server:
  port: ${PORT:8080}
  shutdown: graceful

spring:
  application:
    name: equilibrium

  # ─────────────────────────────────────────────────────────────
  # Datasource (PostgreSQL 16)
  # ─────────────────────────────────────────────────────────────
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/equilibrium}
    username: ${DB_USERNAME:equilibrium}
    password: ${DB_PASSWORD:}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2

  # ─────────────────────────────────────────────────────────────
  # Flyway migrations (DDL lives in db/migration/V*.sql)
  # ─────────────────────────────────────────────────────────────
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

  # ─────────────────────────────────────────────────────────────
  # JPA / Hibernate
  # ─────────────────────────────────────────────────────────────
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate        # schema owned by Flyway; never auto-create
    properties:
      hibernate:
        jdbc.time_zone: UTC
        format_sql: false
    show-sql: false

  # ─────────────────────────────────────────────────────────────
  # Google OAuth2 client (Authorization Code + PKCE)
  # ─────────────────────────────────────────────────────────────
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
            scope:
              - email
              - profile
        provider:
          google:
            authorization-uri: https://accounts.google.com/o/oauth2/v2/auth
            token-uri: https://oauth2.googleapis.com/token
            user-info-uri: https://www.googleapis.com/oauth2/v3/userinfo
            user-name-attribute: sub

  # ─────────────────────────────────────────────────────────────
  # Jackson serialization
  # ─────────────────────────────────────────────────────────────
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false

# ─────────────────────────────────────────────────────────────
# Application-specific settings
# ─────────────────────────────────────────────────────────────
app:
  jwt:
    # HS256 signing secret — 64-byte random, base64-encoded
    secret: ${JWT_SECRET:}
    access-ttl-minutes: 15
    refresh-ttl-days: 30
    issuer: equilibrium-api

  cors:
    allowed-origins: ${CORS_ORIGINS:https://app.equilibrium.dev,http://localhost:5173}

  auth:
    password-min-length: 8
    reset-token-ttl-minutes: 30
    login-rate-limit-per-minute: 10

  rebalance:
    auto-approve-max-amount: 500      # USD threshold for auto-approval
    commission-bps: 0                 # flat commission model placeholder

  pricing:
    # Market-data provider for latest + historical closes (ingestion out of scope)
    source: ${PRICE_SOURCE:fixture}

# ─────────────────────────────────────────────────────────────
# springdoc-openapi (Swagger UI)
# ─────────────────────────────────────────────────────────────
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
    tags-sorter: alpha
    operations-sorter: alpha

# ─────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────
logging:
  level:
    root: INFO
    com.equilibrium: DEBUG
    org.hibernate.SQL: WARN        # keep passwords/tokens out of logs
```

## Runtime environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | `8080` | HTTP port |
| `DB_URL` | yes | — | JDBC URL |
| `DB_USERNAME` | yes | — | DB user |
| `DB_PASSWORD` | yes | — | DB password |
| `JWT_SECRET` | yes | — | 64-byte HS256 secret (base64) |
| `GOOGLE_CLIENT_ID` | dev | — | Google OAuth2 client id |
| `GOOGLE_CLIENT_SECRET` | dev | — | Google OAuth2 client secret |
| `CORS_ORIGINS` | no | `https://app.equilibrium.dev,http://localhost:5173` | Allowed SPA origins |
| `PRICE_SOURCE` | no | `fixture` | Market-data provider |
| `ENV` | no | — | Profile selector (`dev`, `prod`) |

## Profile notes

- **`dev`** — `show-sql: true`, `PRICE_SOURCE: fixture` (deterministic seed matching the
  current frontend mocks), relaxed CORS for `localhost:5173`.
- **`prod`** — `show-sql: false`, real price feed, strict CORS, rate limits enforced,
  `Cache-Control: no-store` on auth responses.

## Migration example

Flyway owns the schema. First migration = the full DDL from
[01-domain-model.md](01-domain-model.md):

```
src/main/resources/db/migration/
├── V1__init_schema.sql        # users, portfolios, target_allocations, positions,
│                              # rebalance_events, notifications, notification_preferences,
│                              # refresh_tokens, password_reset_tokens
├── V2__price_snapshots.sql    # position_prices, benchmark_prices
└── V3__seed_demo_data.sql     # (dev only) fixture portfolio + prices
```

Keep migrations immutable once shipped; add `V{n+1}__...` for changes.
