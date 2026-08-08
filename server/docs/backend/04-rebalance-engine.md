# Rebalance Engine

The rebalance engine reproduces, on the server, the drift math the frontend currently does in
`src/data/portfolio.tsx`, `src/components/charts.tsx` (DriftGauge), and
`src/state/portfolio.tsx` (`executeTrades`). It runs as pure domain logic so every consumer
(dashboard gauge, holdings table, proposals, analytics) agrees on the numbers.

## 1. Inputs

Per portfolio:

- **Positions** with latest prices → current values.
- **Target allocation** (`bonds/domestic/intl/real_estate`).
- **Drift threshold** (e.g. `3.5`).
- Optionally a **risk profile** for the default target when none is customized.

## 2. Drift computation

For each position `p`:

```
value(p)      = shares(p) × price(p)
total         = Σ value(p)
current(p)    = round( value(p) / total × 100 , 1 )        // e.g. 38.4
target(p)     = mapped from the position's asset class → target allocation bucket
delta(p)      = round( current(p) − target(p) , 1 )        // e.g. +3.4, -2.7
```

Portfolio-level drift:

```
driftPct = round( max( |delta(p)| over all p ) , 1 )        // matches frontend
```

### Status zones (matches `DriftGauge` + the gauge legend)

| Zone | Condition | Color | UI text |
|---|---|---|---|
| `balanced` | `|delta| ≤ threshold` | `#2F6E5B` | `±{threshold}%` |
| `caution`  | `threshold < |delta| ≤ 8` | `#D98E3F` | `±{threshold}–8%` |
| `action`   | `|delta| > 8` | `#B4483D` | `>±8%` |

The gauge needle angle is derived in the frontend from `drift` (clamped to `±12%`); the
backend only needs to return `driftPct`.

## 3. Proposal generation

A proposal is generated for every position whose `|delta(p)| > threshold`. This exactly
matches the dashboard banner rule (`driftPct > threshold`) and the Rebalance page's "trades
proposed when drift exceeds threshold".

```
for each position p:
    if |delta(p)| <= threshold:  continue                 // balanced, no trade
    action = delta(p) > 0 ? SELL : BUY                    // overweight → sell, underweight → buy

    // Order size drives the position back to target (delta → 0):
    valueToTrade(p) = |delta(p)| / 100 × total

    if action == BUY:
        shares(p) = valueToTrade(p) / price(p)
    else:
        shares(p) = valueToTrade(p) / price(p)

    amount(p)     = round( shares(p) × price(p) , 2 )     // USD traded
    cost(p)       = commission(p)                         // broker fee; 0 for no-fee (e.g. fractional)
```

### Rationale text

Generated from a template so the UI rationale panels read naturally:

```
SELL: "Reduces total-market equity from {current}% to {target}%, matching your {profile} target."
BUY:  "Increases {asset-class} allocation from {current}% to {target}%, {benefit phrase}."
```

`benefit phrase` by class:
- bonds → `improving downside protection`
- international equity → `increasing diversification`
- domestic equity → `staying invested in market growth`
- real estate → `trimming an overweight position`

### Example (matches the current mock)

Given `total = $128,390`, threshold `3.5`, target `{bonds:40, domestic:40, intl:15, real_estate:5}`:

| Ticker | current | target | delta | Action | shares | amount | cost | rationale |
|---|---|---|---|---|---|---|---|---|
| VTI | 38.4 | 35.0 | +3.4 | SELL | 18.3 | $4,328 | $3.50 | Reduces total-market equity… |
| BND | 22.3 | 25.0 | −2.7 | BUY | 21.7 | $3,462 | $0 | Increases bond allocation… |
| VXUS | 18.1 | 20.0 | −1.9 | BUY | 9.1 | $2,439 | $0 | Increases international… |
| VNQ | 9.8 | 8.0 | +1.8 | SELL | 6.4 | $1,026 | $1.75 | Trims real estate… |

`GLD`/`TIP` have `|delta| ≤ 0.5` → classified `balanced` in the drift table (no proposal).

### Auto-approve rule

If `auto_approve == true` **and** `Σ amount ≤ $500`, the trade is eligible for automatic
execution without a confirm step (the Settings toggle text: "Small rebalancing trades will
execute automatically"). The `POST /rebalance/execute` endpoint always executes current
proposals; auto-approve only controls whether the UI requires confirmation first.

## 4. Execution (`POST /portfolios/{id}/rebalance/execute`)

Atomically (single transaction, optimistic lock on the portfolio):

1. Load proposals (recompute — do not trust a client-supplied list).
2. If none → `409 CONFLICT`.
3. For each BUY: deduct `amount` from cash, add `shares` to the position.
   For each SELL: add `amount` to cash, remove `shares` from the position.
4. Recompute positions' `current`/`delta` from the new values (matches the frontend's
   `executeTrades` re-weighting in `src/state/portfolio.tsx:72-94`).
5. Update portfolio `value`.
6. Append a `rebalance_events` row: `{ trigger: 'Approved rebalance', trades: n, cost: Σ }`.
7. Push a `trade` notification to the user: `"{n} trades executed successfully. Portfolio rebalanced."`
8. Persist idempotency record for the client `requestId`.

### Idempotency

```
if exists(executions where request_id = :requestId and portfolio_id = :id):
    return stored result                     // replay
else:
    execute; store result; return result
```

### Example result (frontend shape)

```json
{
  "executedTrades": 4,
  "totalAmount": 11255,
  "totalCost": 5.25,
  "portfolioValue": 128945.20,
  "event": { "date": "2026-08-02T16:00:00Z", "trigger": "Approved rebalance", "trades": 4, "cost": "$5.25" },
  "positions": [ { "ticker": "VTI", "current": 35.0, "target": 35.0, "delta": 0.0, "value": 48321 } ]
}
```

## 5. Drift notification trigger

The dashboard banner ("Your portfolio has drifted X% from target") appears when
`driftPct > threshold`. The backend should emit a `drift` notification when a rebalance or a
price update causes drift to cross the threshold:

```
on state change: newDrift = computeDrift(portfolio)
if newDrift > threshold and previousDrift <= threshold:
    notify(user, "drift", "Portfolio has drifted {newDrift}% from target — review rebalancing.")
```

## 6. Rounding rules

- Weights: 1 decimal (`.toFixed(1)`), values in USD: 2 decimals.
- `amount = shares × price` rounded to 2 decimals; `shares` up to 6 decimals (fractional).
- Never round the intermediate `total` before computing weights (drift math must match the
  frontend, which also uses unrounded totals).
- Sum of per-position `current` weights may differ from 100 by ±0.1 after rounding — the
  frontend already tolerates this; do not "fix" by distributing the residual.
