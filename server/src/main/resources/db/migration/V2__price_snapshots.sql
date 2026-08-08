-- position_prices (daily closes per position)
CREATE TABLE position_prices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID NOT NULL REFERENCES positions (id) ON DELETE CASCADE,
    as_of       DATE        NOT NULL,
    close       NUMERIC(18,4) NOT NULL,
    UNIQUE (position_id, as_of)
);

CREATE INDEX idx_position_prices_position_date
    ON position_prices (position_id, as_of DESC);

-- benchmark_prices (single market benchmark series)
CREATE TABLE benchmark_prices (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    as_of DATE NOT NULL UNIQUE,
    close NUMERIC(18,4) NOT NULL
);
