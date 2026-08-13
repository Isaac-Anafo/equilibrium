# REST API Reference

Base URL: `https://<host>/api/v1`

All endpoints return/consume `application/json`. Authenticated endpoints require
`Authorization: Bearer <access-token>` (see [03-authentication.md](03-authentication.md)).

The schema names below are chosen to mirror the frontend TypeScript interfaces in
`src/data/portfolio.tsx` and `src/state/*`, so field names match the React code 1:1.

---

## Conventions

### Response envelope

Successful responses return the payload directly (no wrapper). Errors use a unified envelope:

```json
{
  "error": {
    "code": "DRIFT_THRESHOLD_OUT_OF_RANGE",
    "message": "Enter a value between 0.5% and 20%.",
    "status": 422,
    "fieldErrors": { "threshold": "must be <= 20" }
  }
}
```

### Error codes / status

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Malformed JSON, invalid enum, bad `range` |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 403 | `FORBIDDEN` | Authenticated but not owner of the resource |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `EMAIL_TAKEN` | Sign-up with an existing email |
| 422 | `UNPROCESSABLE_ENTITY` | Business rule violation (e.g. allocation ≠ 100, threshold out of range) |
| 429 | `TOO_MANY_REQUESTS` | Rate limited (auth endpoints) |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

### Common query conventions

- Analytics `range`: one of `1M`, `6M`, `1Y`, `All` (matches `RANGES` in `src/data/portfolio.tsx`).
  Invalid → `400 VALIDATION_ERROR`.
- Money as JSON numbers; percentages as JSON numbers (e.g. `38.4`).

---

## Auth

### `POST /auth/signin` — public

Sign in with email + password. Used by `src/pages/SignIn.tsx`.

Request:
```json
{
  "email": "you@example.com",
  "password": "••••••••"
}
```

Response `200`:
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "f4c2...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": { "email": "you@example.com", "displayName": null }
}
```

Errors: `401 UNAUTHORIZED` (bad credentials — frontend shows "Incorrect email or password.").

### `POST /auth/signup` — public

Create an account. Used by onboarding `StepAccount.tsx`/`StepComplete.tsx`.

Request:
```json
{
  "email": "you@example.com",
  "password": "8+ chars",
  "displayName": null
}
```

Response `201` — same shape as sign-in (auto-login after sign-up, matching the frontend
`signUp(email)` → dashboard redirect).

Errors: `409 EMAIL_TAKEN`, `422 VALIDATION_ERROR` (password < 8 chars).

### `POST /auth/google` — public

Exchange a Google authorization code for a session. The frontend runs the OAuth2
Authorization Code flow against Google, then posts the code here. See
[03-authentication.md](03-authentication.md).

Request:
```json
{ "code": "4/0AY0e-g...", "redirectUri": "https://app.example.com/auth/callback" }
```

Response `200` — same shape as sign-in. Creates or links the user by `google_subject`.

### `POST /auth/refresh` — public

Rotate the access token. Rotation invalidates the presented refresh token and issues a new pair.

Request:
```json
{ "refreshToken": "f4c2..." }
```

Response `200` — `{ accessToken, refreshToken, expiresIn, tokenType, user }`.
Errors: `401 UNAUTHORIZED` (revoked/expired/replay).

### `GET /auth/me` — authenticated

Current user (matches `AuthUser` in `src/state/auth.tsx`).

Response `200`:
```json
{ "email": "you@example.com", "displayName": null }
```

### `POST /auth/forgot-password` — public

Used by `src/pages/ForgotPassword.tsx`. Always returns `200` even if the email is unknown
(to avoid user enumeration).

Request:
```json
{ "email": "you@example.com" }
```

Response `200`: `{ "message": "If an account exists, a reset link has been sent." }`

### `POST /auth/reset-password` — public

Complete a password reset.

Request:
```json
{ "token": "reset-token", "newPassword": "new-password" }
```

Response `204`. Errors: `400` (expired/invalid token).

---

## Portfolios

### `POST /portfolios` — authenticated

Create a portfolio during onboarding. Mirrors `FormState` (`StepAccount` → `StepPortfolio` → `StepHoldings`).

Request:
```json
{
  "name": "Retirement · Index Core",
  "riskProfile": "balanced",
  "driftThreshold": 3.5,
  "holdings": [
    { "ticker": "VTI", "name": "Vanguard Total Market", "shares": 120, "price": 410.64 }
  ]
}
```

`holdings` is optional (frontend allows "Skip for now"). `riskProfile` ∈ `conservative | balanced | growth`.

Response `201`:
```json
{ "id": "3b4a...", "name": "Retirement · Index Core", "riskProfile": "balanced" }
```

### `GET /portfolios/{id}/summary` — authenticated (owner)

Headline numbers for `src/pages/Dashboard.tsx`.

Response `200`:
```json
{
  "value": 128390.00,
  "totalReturn": 6.4,
  "dayReturn": 1.2,
  "driftPct": 4.8,
  "threshold": 3.5,
  "asOf": "2026-08-02T16:00:00Z"
}
```

### `GET /portfolios/{id}/holdings` — authenticated (owner)

Rows for the dashboard holdings table and the Rebalance current-vs-target table.

Response `200` — array of `HoldingsRow` (sorted client-side; server returns by weight desc):
```json
[
  { "ticker": "VTI",  "name": "Vanguard Total Market", "current": 38.4, "target": 35.0, "value": 49277, "delta": 3.4 },
  { "ticker": "BND",  "name": "Vanguard Total Bond",   "current": 22.3, "target": 25.0, "value": 28640, "delta": -2.7 }
]
```

### `GET /portfolios/{id}/activity` — authenticated (owner)

Compiled change history for the "Change history" timeline under the Analytics performance
chart. Every user-driven change is recorded: rebalances, drift-threshold changes, target
allocation updates, and auto-approve toggles. Newest first.

Response `200` — array of `Activity`:
```json
[
  { "date": "2026-08-13T14:30:00Z", "type": "rebalance",    "summary": "Rebalanced portfolio: 4 trade(s) executed, 11255 moved, est. cost $5.25." },
  { "date": "2026-08-02T09:00:00Z", "type": "allocation",   "summary": "Updated target allocation to 35/40/20/5." },
  { "date": "2026-07-15T11:00:00Z", "type": "threshold",    "summary": "Changed drift threshold to 4.0%." },
  { "date": "2026-06-20T16:00:00Z", "type": "auto_approve", "summary": "Enabled auto-approve for trades under $500." }
]
```

`type` ∈ `rebalance | threshold | allocation | auto_approve` (drives the icon map in
`src/pages/Analytics.tsx`).

### `GET /portfolios/{id}/target-allocation` — authenticated (owner)

Matches `TargetAllocation` in `src/state/portfolio.tsx`.

Response `200`:
```json
{ "bonds": 40, "domestic": 40, "intl": 15, "real_estate": 5 }
```

### `PUT /portfolios/{id}/target-allocation` — authenticated (owner)

Used by `Settings.tsx`. Sum must equal 100.

Request:
```json
{ "bonds": 35, "domestic": 40, "intl": 20, "real_estate": 5 }
```

Response `200` — the saved allocation. Errors: `422` when the sum ≠ 100 (frontend disables
"Save changes" until `total === 100`).

### `GET /portfolios/{id}/settings/drift-threshold`

Response `200`:
```json
{ "threshold": 3.5 }
```

### `PUT /portfolios/{id}/settings/drift-threshold`

Request:
```json
{ "threshold": 4.0 }
```

Response `200`: `{ "threshold": 4.0 }`. Errors: `422` when `threshold < 0.5 || threshold > 20`.

### `GET /portfolios/{id}/settings/auto-approve`

Response `200`:
```json
{ "autoApprove": false }
```

### `PUT /portfolios/{id}/settings/auto-approve`

Request:
```json
{ "autoApprove": true }
```

Response `200`: `{ "autoApprove": true }`.

---

## Rebalance

### `GET /portfolios/{id}/rebalance/proposals` — authenticated (owner)

Proposed trades from the rebalance engine. Empty array when the portfolio is in balance.

Response `200` — array of `ProposedTrade`:
```json
[
  {
    "ticker": "VTI",
    "name": "Vanguard Total Market",
    "action": "Sell",
    "shares": 18.3,
    "amount": 4328,
    "cost": 3.50,
    "rationale": "Reduces total-market equity from 38.4% to 35.0%, matching your balanced target."
  }
]
```

Algorithm and rationale generation: [04-rebalance-engine.md](04-rebalance-engine.md).

### `POST /portfolios/{id}/rebalance/execute` — authenticated (owner)

Execute the current proposed trades atomically. Mirrors `executeTrades` in
`src/state/portfolio.tsx`. Honors `auto_approve` semantics: if `autoApprove` is on and the
total amount ≤ $500, execution proceeds without a confirm step in future UIs; the endpoint
itself always executes the proposals.

Request:
```json
{ "requestId": "6f4a2b13-9f5a-4b0e-8d1c-001122334455" }
```

`requestId` (client-generated UUID) makes execution **idempotent** — replaying the same
`requestId` returns the same result without double-executing.

Response `200`:
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

Errors: `409 CONFLICT` when there are no proposals to execute.

### `GET /portfolios/{id}/rebalance/log` — authenticated (owner)

Rebalancing history for `Analytics.tsx`.

Response `200` — array of `RebalanceEvent`:
```json
[
  { "date": "2026-07-15T14:30:00Z", "trigger": "Approved rebalance", "trades": 3, "cost": "$5.25" },
  { "date": "2025-04-03T11:15:00Z", "trigger": "Manual review", "trades": 4, "cost": "$7.00" }
]
```

> The frontend renders `date` as-is (e.g. "Jul 15, 2025"), so the backend may return a
> pre-formatted display string (`"Jul 15, 2026 · 2:30 PM"`) in the `date` field and keep the
> canonical timestamp in a `createdAt` field if the team prefers pre-formatted labels.

---

## Analytics

### `GET /portfolios/{id}/performance?range=1M|6M|1Y|All` — authenticated (owner)

Performance series for `PerfChart` (`recharts`). `range` default `1Y`.

Response `200` — array of `ChartPoint`:
```json
[
  { "date": "Jul 6", "portfolio": 100.12, "benchmark": 99.84 },
  { "date": "Jul 13", "portfolio": 101.25, "benchmark": 100.31 }
]
```

Both series are normalized to `100` at the start of the window, matching
`buildChartData` in `src/data/portfolio.tsx`.

### `GET /portfolios/{id}/metrics` — authenticated (owner)

Risk & return metrics for `METRICS` in `src/data/portfolio.tsx`.

Response `200`:
```json
[
  { "key": "sharpe",   "label": "Sharpe ratio",  "value": "1.34", "gloss": "Return earned per unit of risk taken. Above 1 is good, above 2 very good; below 0 means it lost money." },
  { "key": "sortino",  "label": "Sortino ratio", "value": "1.87", "gloss": "Like Sharpe, but only counts downside (loss) movements as risk. Higher means smoother gains without sharp falls." },
  { "key": "vol",      "label": "Volatility",    "value": "11.2%", "gloss": "Annualised standard deviation of returns. Lower means a smoother ride; higher means bigger swings." },
  { "key": "drawdown", "label": "Max drawdown",  "value": "-8.4%", "gloss": "Largest peak-to-trough decline - the worst moment from a high. Less negative means it held up better." }
]
```

`key` is a stable machine id; `label`/`gloss` are display text (frontend currently hardcodes
them, so the backend can serve them for consistency).

---

## Notifications

### `GET /notifications` — authenticated

Notification list for `src/pages/Notifications.tsx` and the header bell. Unread count is
derived client-side from the array (matches `src/state/notifications.tsx`).

Response `200`:
```json
[
  { "id": "9f2a...", "type": "drift", "text": "Portfolio has drifted 4.8% from target — review rebalancing.", "time": "2026-08-02T09:14:00Z", "unread": true },
  { "id": "1c77...", "type": "trade", "text": "3 trades executed successfully. Portfolio rebalanced.", "time": "2026-07-15T14:30:00Z", "unread": false }
]
```

`type` ∈ `drift | trade | system` (drives the icon map in `src/pages/Notifications.tsx`).
Order: newest first.

### `POST /notifications/read-all` — authenticated

Marks every unread notification as read (button in `Notifications.tsx`).

Response `204`.

### `POST /notifications/{id}/read` — authenticated

Marks a single notification as read without touching the rest (click on an unread
notification in `Notifications.tsx`).

Response `204`.

### `GET /notifications/preferences` — authenticated

Matches `notifPrefs` in `src/state/portfolio.tsx`.

Response `200`:
```json
{ "email": true, "push": false }
```

### `PUT /notifications/preferences` — authenticated

Request:
```json
{ "email": true, "push": true }
```

Response `200`: the saved preferences.

---

## Chat

### `POST /chat` — authenticated (stream)

AI assistant. Streams a response as `text/event-stream`; each SSE event is a JSON payload
(`data: { "delta": "…" }` for text chunks, `data: { "done": true }` at the end, or
`data: { "error": "…" }` on failure). Requires `app.chat.enabled` + `OPENAI_API_KEY`; otherwise
it streams a single `error` event.

The server builds the system prompt from the app's rebalance/asset-class rules plus a snapshot
of the caller's own portfolio (holdings, drift, target allocation, pending proposals, recent
rebalance events) so answers can be personalized.

Request:
```json
{
  "message": "Should I rebalance?",
  "history": [
    { "role": "user", "content": "Is my portfolio balanced?" },
    { "role": "assistant", "content": "Your portfolio has drifted 3.4%..." }
  ]
}
```

`history` is optional and capped at the last 20 messages. Rate-limited like auth endpoints.

---

## Idempotency & concurrency

- `POST /portfolios/{id}/rebalance/execute` is idempotent via the `requestId` in the request
  body. Store the completed execution against the `requestId`; return the stored result on
  replay.
- `PUT /portfolios/{id}/target-allocation`, `PUT .../settings/*` use optimistic locking
  (`@Version`) and return `409 CONFLICT` on stale writes so the frontend can re-fetch.

## Caching

- `GET /portfolios/{id}/holdings` and `GET /portfolios/{id}/summary` — `ETag` on
  `updated_at` of the portfolio aggregate; `304 Not Modified` support.
- `GET /portfolios/{id}/performance` — cacheable for 1 minute (series recomputed by the
  analytics projection); `Cache-Control: public, max-age=60`.
- Auth endpoints: `Cache-Control: no-store` always.
