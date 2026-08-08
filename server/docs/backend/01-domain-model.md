# Domain Model & DDL

Entities, relationships, and PostgreSQL DDL for the Equilibrium backend. Every entity maps to
a shape the React frontend already expects (see `src/data/portfolio.tsx`, `src/state/*`).

## 1. Entity map

| Frontend type | Backend entity | Notes |
|---|---|---|
| `AuthUser` (`{ email }`) | `users` | plus password hash, provider, display name |
| `FormState` (`email`, `password`, `portfolioName`, `riskProfile`, `holdings`) | `users` + `portfolios` + `positions` | onboarding snapshot |
| `TargetAllocation` (`bonds/domestic/intl/real_estate`) | `target_allocations` | 1:1 with portfolio |
| `Holding` (`ticker/name/shares/price`) | `positions` | user-entered holdings |
| `HoldingsRow` (`ticker/name/current/target/value/delta`) | derived from `positions` + `target_allocations` + prices | computed, not stored |
| `ProposedTrade` (`ticker/name/action/shares/amount/cost/rationale`) | transient — computed by `RebalanceEngine` | not persisted |
| `RebalanceEvent` (`date/trigger/trades/cost`) | `rebalance_events` | executed history |
| `Notification` (`id/type/text/time/unread`) | `notifications` | |
| notification prefs (`email`, `push`) | `notification_preferences` | 1:1 with user |
| — | `refresh_tokens`, `password_reset_tokens` | auth support |

### Relationships

```
users ─┬─ 1:1 ── notification_preferences
       ├─ 1:N ── portfolios
       ├─ 1:N ── notifications
       ├─ 1:N ── refresh_tokens
       └─ 1:N ── password_reset_tokens

portfolios ─┬─ 1:1 ── target_allocations
            ├─ 1:N ── positions
            └─ 1:N ── rebalance_events
```

## 2. DDL

```sql
-- ─────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(254) NOT NULL UNIQUE,
    password_hash     VARCHAR(255),                 -- BCrypt; NULL for Google-only accounts
    display_name      VARCHAR(120),
    provider          VARCHAR(16)  NOT NULL DEFAULT 'LOCAL',  -- 'LOCAL' | 'GOOGLE'
    google_subject    VARCHAR(255) UNIQUE,          -- Google 'sub' for SSO linkage
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- ─────────────────────────────────────────────────────────────
-- portfolios
-- ─────────────────────────────────────────────────────────────
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    risk_profile    VARCHAR(32)  NOT NULL,          -- 'conservative' | 'balanced' | 'growth'
    drift_threshold NUMERIC(5,1) NOT NULL DEFAULT 3.5,  -- %; matches DRIFT_THRESHOLD
    auto_approve    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolios_user_id ON portfolios (user_id);

-- ─────────────────────────────────────────────────────────────
-- target_allocations (1:1 with portfolio)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE target_allocations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL UNIQUE REFERENCES portfolios (id) ON DELETE CASCADE,
    bonds        NUMERIC(5,1) NOT NULL DEFAULT 40,
    domestic     NUMERIC(5,1) NOT NULL DEFAULT 40,
    intl         NUMERIC(5,1) NOT NULL DEFAULT 15,
    real_estate  NUMERIC(5,1) NOT NULL DEFAULT 5,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_target_sum_100 CHECK (bonds + domestic + intl + real_estate = 100)
);

-- ─────────────────────────────────────────────────────────────
-- positions (user-entered holdings; shares/price entered as strings in the UI)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE positions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    ticker        VARCHAR(16)  NOT NULL,            -- uppercased, e.g. 'VTI'
    name          VARCHAR(120) NOT NULL DEFAULT '',
    shares        NUMERIC(18,6) NOT NULL DEFAULT 0, -- fractional shares allowed
    price         NUMERIC(18,4) NOT NULL,           -- latest price per share (USD)
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (portfolio_id, ticker)
);

CREATE INDEX idx_positions_portfolio_id ON positions (portfolio_id);

-- ─────────────────────────────────────────────────────────────
-- rebalance_events (executed rebalances; feeds Analytics timeline)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE rebalance_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    executed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    trigger       VARCHAR(120) NOT NULL,            -- e.g. 'Approved rebalance'
    trades        INTEGER      NOT NULL,            -- number of trades executed
    cost          NUMERIC(12,2) NOT NULL DEFAULT 0  -- USD trading costs
);

CREATE INDEX idx_rebalance_events_portfolio_date
    ON rebalance_events (portfolio_id, executed_at DESC);

-- ─────────────────────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(16) NOT NULL,                -- 'drift' | 'trade' | 'system'
    text       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unread     BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, unread);

-- ─────────────────────────────────────────────────────────────
-- notification_preferences (1:1 with user)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notification_preferences (
    user_id    UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email      BOOLEAN NOT NULL DEFAULT TRUE,
    push       BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- refresh_tokens (rotating JWT refresh tokens)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,         -- SHA-256 of the token, never the raw token
    expires_at TIMESTAMPTZ NOT NULL,
    revoked    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    replaced_by UUID REFERENCES refresh_tokens (id)   -- set on rotation
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ─────────────────────────────────────────────────────────────
-- password_reset_tokens
-- ─────────────────────────────────────────────────────────────
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens (user_id);
```

## 3. Computed values (not stored)

These are derived per request and match the frontend's `HoldingsRow`/summary shapes:

- **Position value** — `shares × price`
- **Current weight** — `positionValue / portfolioValue × 100`
- **Delta** — `current − target` (rounded to 1 decimal, e.g. `+3.4`, `-1.2`)
- **Overall drift** — `max(|delta|)` across all positions (matches `driftPct`)
- **Total return / day return** — portfolio performance over the window vs. prior close;
  seeded from a daily price/return snapshot table (see note below)
- **Risk metrics** — Sharpe, Sortino, volatility, max drawdown, computed from the
  performance series

### Price/return snapshots (market data)

To compute `HoldingsRow.current`, portfolio `value`, `totalReturn`, `dayReturn`, and the
`performance` series, the backend needs historical and latest prices:

```sql
CREATE TABLE position_prices (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions (id) ON DELETE CASCADE,
    as_of      DATE        NOT NULL,                -- trading day
    close      NUMERIC(18,4) NOT NULL,
    UNIQUE (position_id, as_of)
);

CREATE TABLE benchmark_prices (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    as_of DATE NOT NULL UNIQUE,
    close NUMERIC(18,4) NOT NULL
);
```

Pricing can be seeded from a market-data provider (ingestion job is out of scope for this
doc). For parity with the current mock, the API may serve `dayReturn`/`totalReturn` from the
latest snapshot until a live feed is connected.

## 4. JPA entity notes

- Use `@Version` on mutable aggregates (`portfolios`, `target_allocations`) to protect against
  lost updates from concurrent `PUT` requests.
- Store `UUID` PKs (`org.hibernate.annotations.UuidGenerator`), `OffsetDateTime` timestamps.
- `target_allocations` and `notification_preferences` are single-row-per-parent; model as
  `@OneToOne` with `@JoinColumn(unique)`.
- `rebalance_events` and `notifications` are append-only; model with `Long`-count queries for
  unread counts rather than loading whole tables.
- Enum columns (`provider`, `risk_profile`, `type`, `action`) stored as `VARCHAR` with
  `@Enumerated(EnumType.STRING)` for readability.
