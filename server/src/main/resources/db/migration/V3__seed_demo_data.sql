-- V3__seed_demo_data.sql
-- Demo user: demo@equilibrium.app / demo1234 (password hash set by DemoDataSeeder on boot)

INSERT INTO users (id, email, password_hash, display_name, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111',
        'demo@equilibrium.app',
        'seed-pending',
        'Demo User',
        now(),
        now());

INSERT INTO portfolios (id, user_id, name, risk_profile, drift_threshold, auto_approve, created_at, updated_at)
VALUES ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'Retirement · Index Core',
        'balanced',
        3.5,
        FALSE,
        now(),
        now());

INSERT INTO target_allocations (id, portfolio_id, bonds, domestic, intl, real_estate, updated_at)
VALUES ('33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222',
        40, 40, 15, 5,
        now());

INSERT INTO positions (id, portfolio_id, ticker, name, asset_class, shares, price)
VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'VTI',  'Vanguard Total Market', 'DOMESTIC',    70,   410.64),
 ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'GLD',  'SPDR Gold Shares',     'DOMESTIC',    182,  144.78),
 ('aaaaaaaa-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'BND',  'Vanguard Total Bond',  'BONDS',       330,  81.83),
 ('aaaaaaaa-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'TIP',  'iShares TIPS Bond',    'BONDS',       156,  115.17),
 ('aaaaaaaa-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'VXUS', 'Vanguard Intl Stock',  'INTL',        210,  61.17),
 ('aaaaaaaa-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', 'VNQ',  'Vanguard Real Estate', 'REAL_ESTATE', 390,  39.33);

INSERT INTO notification_preferences (user_id, email, push, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', TRUE, FALSE, now());

INSERT INTO notifications (id, user_id, type, text, created_at, unread)
VALUES
 ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'drift',  'Portfolio has drifted 7.0% from target — review rebalancing.', now() - INTERVAL '2 hours', TRUE),
 ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'system', 'Welcome to Equilibrium! Review your target allocation in Settings.', now() - INTERVAL '1 day', FALSE);

-- position price series: 3 years of deterministic daily closes, ending at each position's current price
INSERT INTO position_prices (position_id, as_of, close)
SELECT p.pid::uuid,
       (DATE '2026-08-03' - s.idx)::date,
       round((p.base * pow(1 + p.ann, s.idx::double precision / 365) * (1 + p.amp * sin(s.idx::double precision * p.freq + p.phase)) /
             (pow(1 + p.ann, 1095.0 / 365) * (1 + p.amp * sin(1095.0 * p.freq + p.phase))))::numeric, 4)
FROM generate_series(0, 1095) AS s(idx)
CROSS JOIN (
    SELECT 'aaaaaaaa-0000-0000-0000-000000000001' AS pid, 410.64 AS base, 0.090 AS ann, 0.028 AS amp, 0.050 AS phase, 0.052 AS freq
    UNION ALL SELECT 'aaaaaaaa-0000-0000-0000-000000000002', 144.78, 0.055, 0.024, 1.200, 0.061
    UNION ALL SELECT 'aaaaaaaa-0000-0000-0000-000000000003', 81.83, 0.030, 0.010, 0.800, 0.047
    UNION ALL SELECT 'aaaaaaaa-0000-0000-0000-000000000004', 115.17, 0.024, 0.008, 2.300, 0.043
    UNION ALL SELECT 'aaaaaaaa-0000-0000-0000-000000000005', 61.17, 0.070, 0.026, 0.350, 0.058
    UNION ALL SELECT 'aaaaaaaa-0000-0000-0000-000000000006', 39.33, 0.060, 0.030, 1.900, 0.066
) p;

-- benchmark price series (normalized to 100 at the end)
INSERT INTO benchmark_prices (as_of, close)
SELECT (DATE '2026-08-03' - s.idx)::date,
       round((100 * pow(1 + 0.08, s.idx::double precision / 365) * (1 + 0.03 * sin(s.idx::double precision * 0.06 + 0.10)) /
             (pow(1 + 0.08, 1095.0 / 365) * (1 + 0.03 * sin(1095.0 * 0.06 + 0.10))))::numeric, 4)
FROM generate_series(0, 1095) AS s(idx);
