-- V6__portfolio_activities.sql
-- Compiled change history: every user-driven change to a portfolio (rebalances plus
-- immediate strategy changes) is recorded here so the Analytics page can show one full
-- timeline under the performance chart.

CREATE TABLE portfolio_activities (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id  UUID NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    type          VARCHAR(32)  NOT NULL,
    summary       VARCHAR(500) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_activities_portfolio_date
    ON portfolio_activities (portfolio_id, created_at DESC);

-- Demo portfolio: seed a realistic change history alongside the existing demo data.
INSERT INTO portfolio_activities (portfolio_id, type, summary, created_at)
VALUES
 ('22222222-2222-2222-2222-222222222222', 'REBALANCE', 'Executed 4 trades - $5,268.00 moved, est. cost $5.25.',           now() - INTERVAL '12 days'),
 ('22222222-2222-2222-2222-222222222222', 'ALLOCATION', 'Updated target allocation to 40 / 40 / 15 / 5.',                    now() - INTERVAL '30 days'),
 ('22222222-2222-2222-2222-222222222222', 'THRESHOLD',  'Changed drift threshold from 3.0% to 3.5%.',                      now() - INTERVAL '60 days'),
 ('22222222-2222-2222-2222-222222222222', 'AUTO_APPROVE', 'Enabled auto-approve for trades under $500.',                    now() - INTERVAL '120 days');