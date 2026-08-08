-- users
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(254) NOT NULL UNIQUE,
    password_hash     VARCHAR(255),
    display_name      VARCHAR(120),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- portfolios
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    risk_profile    VARCHAR(32)  NOT NULL,
    drift_threshold NUMERIC(5,1) NOT NULL DEFAULT 3.5,
    auto_approve    BOOLEAN      NOT NULL DEFAULT FALSE,
    version         BIGINT       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolios_user_id ON portfolios (user_id);

-- target_allocations (1:1 with portfolio)
CREATE TABLE target_allocations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL UNIQUE REFERENCES portfolios (id) ON DELETE CASCADE,
    bonds        NUMERIC(5,1) NOT NULL DEFAULT 40,
    domestic     NUMERIC(5,1) NOT NULL DEFAULT 40,
    intl         NUMERIC(5,1) NOT NULL DEFAULT 15,
    real_estate  NUMERIC(5,1) NOT NULL DEFAULT 5,
    version      BIGINT       NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_target_sum_100 CHECK (bonds + domestic + intl + real_estate = 100)
);

-- positions
CREATE TABLE positions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    ticker        VARCHAR(16)  NOT NULL,
    name          VARCHAR(120) NOT NULL DEFAULT '',
    asset_class   VARCHAR(24)  NOT NULL,
    shares        NUMERIC(18,6) NOT NULL DEFAULT 0,
    price         NUMERIC(18,4) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (portfolio_id, ticker)
);

CREATE INDEX idx_positions_portfolio_id ON positions (portfolio_id);

-- rebalance_events
CREATE TABLE rebalance_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    executed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    trigger       VARCHAR(120) NOT NULL,
    trades        INTEGER      NOT NULL,
    cost          NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_rebalance_events_portfolio_date
    ON rebalance_events (portfolio_id, executed_at DESC);

-- rebalance_executions (idempotency for POST /rebalance/execute)
CREATE TABLE rebalance_executions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    request_id    VARCHAR(64) NOT NULL,
    executed_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    result_json   VARCHAR(8000) NOT NULL,
    UNIQUE (portfolio_id, request_id)
);

-- notifications
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(16) NOT NULL,
    text       VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unread     BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_notifications_user_unread
    ON notifications (user_id, unread);

-- notification_preferences (1:1 with user)
CREATE TABLE notification_preferences (
    user_id    UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email      BOOLEAN NOT NULL DEFAULT TRUE,
    push       BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- refresh_tokens
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    replaced_by UUID REFERENCES refresh_tokens (id)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- password_reset_tokens
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX idx_reset_tokens_user ON password_reset_tokens (user_id);
