# Equilibrium — Product Guide

*Plain-English explanation of what this app is, the problem it solves, how it solves it, and what every feature means. Written for product walkthroughs, demos, and evaluations.*

---

## 1. Elevator pitch

**Equilibrium** is an investing dashboard that watches your portfolio the way a good financial advisor does: it makes sure your money stays split up the way you originally chose — not drifting into a lopsided, riskier mix over time.

It defines a target mix for your money, continuously measures how far each holding has drifted from that target, flags the moment something gets out of line, proposes the exact trades to fix it, and lets you approve them — all explained in plain English. It also tracks how your portfolio has performed and answers questions about your money through a built-in AI assistant.

The guiding idea is the name itself: **equilibrium** (balance). A portfolio left alone doesn't stay balanced; Equilibrium makes sure it does.

---

## 2. The problem it solves

**The quiet risk of a "set it and forget it" portfolio.**

When you build an investment portfolio, you deliberately choose how your money is divided among broad categories — safe bond funds, US company stocks, international stocks, and real estate. That mix *is* your plan: it determines how much risk you're taking and how much return you can expect (profiles like "Conservative" or "Growth" are built on it).

But over time, the market moves different categories at very different speeds. Let a stock fund outpace bonds for a few years and, without you doing anything, that "30% equities" plan can quietly become "55% equities." You now hold far more risk than you agreed to — not because you changed anything, but because the world went up under you.

Three reasons this is dangerous:

1. **Your risk silently changed.** A "conservative" plan can drift into effectively a "growth" plan and you'd never notice.
2. **You're concentrated without deciding to be.** The money that grew fastest is also the money you're now most exposed to.
3. **It's invisible.** Nothing "breaks." Your balance just slowly stops matching your intention.

Manually checking every holding against your plan is tedious and easy to skip — most people never do it. That gap is the problem Equilibrium solves.

---

## 3. How Equilibrium solves it

Equilibrium replaces the manual, never-happens check with an automated loop that runs constantly:

| Step | What the app does | Where you see it |
|---|---|---|
| **1. Define your target** | You pick a risk profile and set the target allocation across four asset classes, plus a "drift threshold" (how much variance you're willing to tolerate). | Onboarding, Settings |
| **2. Measure** | For every holding, it computes the current weight in your portfolio vs. the weight your plan says it should have. | Dashboard |
| **3. Alert** | If any holding drifts beyond your tolerance, you get a visible warning and a notification. | Dashboard banner, Notifications |
| **4. Propose** | It proposes the exact fix: which holdings are overweight (sell) and underweight (buy), how many shares, and how much money — with a plain-English reason for every trade. | Rebalance page |
| **5. Act** | You review and confirm, and the app "executes" the trades, brings your portfolio back to target, and logs it. Small trades (under $500) can run automatically if you allow it. | Confirm Trades, Rebalance history |
| …and the cycle starts again. | The market moves; drift eventually reappears; Equilibrium catches it next time. | — |

**The core idea in one line:** *Decide once, automatically stay in balance forever, and always know exactly what and why before you act.*

---

## 4. Core concepts (plain English)

### Portfolio & holdings
Your **portfolio** is your collection of investments — what you currently own. Each individual investment is a **holding** with a ticker symbol (e.g. `VTI`), a name, and the shares you own. Holdings were added during setup (typed in or uploaded as a CSV), and everything the app does is about this one list of holdings.

### The four asset classes
Every holding belongs to one of four broad categories — the "ingredients" your target mix is made of:

- **Bonds** (e.g. `BND`, `TIP`) — money that's essentially loaned out; historically the safest, steadiest bucket.
- **Domestic equity** (e.g. `VTI`, `VOO`, `SPY`) — shares of US companies.
- **International equity** (e.g. `VXUS`, `VEA`) — shares of non-US companies (diversification beyond the US market).
- **Real estate** (e.g. `VNQ`) — property-related investments.

You don't have to classify anything: **the app automatically recognises a holding's category from its ticker** (unknown tickers default to domestic equity).

### Risk profile
When you set up your portfolio you pick your investor type — the app offers three, each with a different expectation of reward vs. risk:

| Profile | Personality | Example target mix | Expected annual return |
|---|---|---|---|
| **Conservative** | Capital preservation — low ups and downs, lower return | 70% bonds · 20% US · 10% intl | 4–6% |
| **Balanced** | Steady compounding, diversified | 40% bonds · 40% US · 20% intl | 6–9% |
| **Growth** | Long-horizon growth, accepts bigger swings | 10% bonds · 55% US · 35% intl | 8–12% |

The profile describes your target temperament; the actual split is fully editable in **Settings** and you can change it any time.

### Target allocation
Your **target allocation** is the planned split of your money across the four classes (it must always add up to exactly 100%). A new portfolio starts at **40% bonds · 40% domestic · 15% international · 5% real estate**.

Because a plan is per-*bucket*, each holding gets its **fair share of its own bucket**: if bonds should be 40% and you own two bond funds, each is individually targeted at 20%. This way the target is always about the actual things you own.

### Drift
**Drift** is how far a holding's actual share has moved away from its share of the plan. For each holding the app computes `current % − target %` (e.g. you planned 20% in that bond fund but it's now actually 23.4% → drift is **+3.4%**).

Your **portfolio drift** is one simple number: **the biggest drift among all your holdings.** It answers the question *"of everything I own, what's the single most out-of-line holding, and by how much?"*

### Drift threshold
Your **threshold** is your tolerance — how far a holding can wander before you want to hear about it. The default is **3.5%** (onboarding sets this), and you can adjust it from **0.5% to 20%** in Settings. A tighter threshold = a more sensitive watchdog.

### The three drift zones
Drift is colour-coded into three zones, used everywhere (the dashboard gauge, the holdings table, the Rebalance page):

| Zone | Colour | Condition | Meaning |
|---|---|---|---|
| **Balanced** | Green | drift within ± your threshold (default ±3.5%) | Close enough to plan — no action |
| **Caution** | Amber | between your threshold and ±8% | Meaningfully off — trades get proposed |
| **Action** | Red | more than ±8% | Well off the rails — treat as urgent |

### Rebalancing
**Rebalancing** is the fix. When a holding drifts past the threshold, the app proposes trades to bring your portfolio back to the plan:

- **Overweight** (drift is positive — you have *more* than planned) → **Sell** that holding.
- **Underweight** (drift is negative — you have *less* than planned) → **Buy** that holding.

Each trade is sized precisely so the holding lands back on its target, and comes with a **plain-English rationale** — e.g. *"Reduces total market equity from 42% to 38%, matching your balanced target"* or *"Increases bonds from 36% to 40%, improving downside protection."*

### Auto-approve (trades under $500)
A Settings toggle, **"Auto-approve trades under $500."** When it's on and the total value of all proposed trades is **$500 or less**, the rebalance runs automatically without asking. Larger trades always require your review. (Default: off.)

### Executing trades
When you confirm, the app executes the proposed trades against your holdings — buys add shares, sells subtract them. Three things make this trustworthy:

- The server **recomputes the trade list itself**; the app never just acts on numbers typed at it — what it executes is what *it* calculates, then it shows you the result.
- Execution is **idempotent-safe**: a completed rebalance can never be applied twice, even if your internet blips and the same request is sent again.
- Every execution is recorded in a **rebalance history** (when, why it was triggered, how many trades, total cost).

### Analytics & performance metrics
Over time, the app builds a record of each holding's daily prices. From that it draws the performance chart and four risk/return statistics, each clickable for a plain-English breakdown:

- **Portfolio value over time** — a line chart of your portfolio's wealth, shown next to a **Benchmark** for comparison (both lines start at 100, so you're comparing *growth*, not dollar amounts).
- **Sharpe ratio** — *return earned per unit of risk taken. Higher is better.*
- **Sortino ratio** — *like Sharpe, but only penalises downside volatility.*
- **Volatility** — *annualised standard deviation of monthly returns* (how choppy the ride is).
- **Max drawdown** — *the largest peak-to-trough decline in the period* (your worst possible "how far it fell from its high" moment).

In this build the price history is produced by a realistic, reproducible **fixture feed** — designed exactly so the demo account's charts and metrics look like a real, fully-populated fintech product. A live market feed plugs in behind the same interface later.

### Notifications
Three kinds of alert, shown in the notification centre and (unread) as a dot on the bell in the header:

- **Drift** (amber) — *"Portfolio has drifted X% from target — review rebalancing."* Fires when a change to your plan pushes a holding past the threshold.
- **Trade** (green) — *"N trades executed successfully. Portfolio rebalanced."* Fires after every execution.
- **System** (grey) — general announcements (e.g. *"Welcome to Equilibrium!"*).

Email notifications default to on, push to off. (Email/push delivery channels are configured; in-app notifications are fully wired.)

### The AI assistant
A floating chat button (bottom-right) opens **Equilibrium Assistant** — an AI that knows the app's domain rules and your actual portfolio. Ask *"Is my portfolio balanced?"*, *"What is portfolio drift?"*, or *"Should I rebalance right now?"* and it answers using your real holdings and the app's real calculations, streaming the reply as it's generated. It gives financial **education** in plain English — never personalised "buy this / sell that" investment advice, by design.

### Accounts & security (in user terms)
- **Sign in** gives you a short-lived session (15 minutes) backed by a long-lived one (30 days) that renews silently as you use the app.
- The sign-in error is *always* the same generic message ("Incorrect email or password") on purpose — so it can't be used to probe whether an email address is registered.
- **Forgot password** always shows the same neutral confirmation ("If an account exists, a reset link is on its way") for the same reason. Reset links are single-use and expire after 30 minutes.
- Sensitive actions are rate-limited per IP (10 requests per 60 seconds) to slow down abuse.
- **Demo account:** `demo@equilibrium.app` / `demo1234` — a fully-populated sample account (portfolio, 6 holdings, drift, notifications, 3 years of price history) so you can explore a complete, realistic experience instantly.

---

## 5. Feature-by-feature tour (every screen)

### Sign in
Returning users land here. Enter email + password → **Sign in**. It's deliberately generic about failures (see security above). "No account yet? **Create one**" starts the onboarding flow; "**Forgot password?**" lets you request a reset link. Already signed in? You're bounced straight to the Dashboard.

### Onboarding (setting up) — 4 steps
1. **Create your account** — email + password (minimum 8 characters).
2. **Name your portfolio & choose a risk profile** — pick Conservative / Balanced / Growth (see table in §4). A **step indicator** (Account → Portfolio → Holdings) tracks progress with green checks.
3. **Add your holdings** — type rows (Ticker / Name / Shares / Price) or **drop in a CSV** (`ticker, shares, price per share`); rows merge by ticker. You can skip and add holdings later.
4. **Complete** — a summary of what you created, then **Go to dashboard**. This is where your account is created and your portfolio is saved (threshold starts at 3.5%, allocation at the 40/40/15/5 default).

During setup you consent to the app's Terms and Privacy Policy.

### Dashboard (your snapshot)
Everything you need at a glance:

- **Stat row** — current **portfolio value** (e.g. `$128,390.00`), your **return today** (+X%, green), your **total return** over the past year, and the data timestamp.
- **Drift gauge** — a half-moon gauge, **−12% to +12%**, needle at your portfolio drift. It's colour-banded and the needle colour tells you the zone: **green = Balanced (within ±3.5%), amber = Caution, red = Action**.
- **Drift banner** — when drift exceeds your threshold, an amber alert appears: *"Your portfolio has drifted X% from target. **Review rebalancing**"* → jumps straight to the Rebalance page.
- **Holdings table** — every holding with its **current weight, its target weight, its drift (▲ red = overweight/too much, ▼ green = underweight/too little, — grey = balanced), and its dollar value**. Sortable by clicking any column header.
- **Performance chart** — your portfolio's growth over time vs. an optional **Benchmark** (toggle it on).

### Drift & Rebalance (the action page)
- A per-holding table: **Asset / Current / Target / Drift / Direction**, where Direction is a badge — **Sell** (overweight), **Buy** (underweight), or **Balanced**.
- If nothing needs fixing: a success panel — *"Your portfolio is within its target allocation … No trades are proposed right now."*
- If trades are proposed: the **proposed trades table** (Asset / Action / Shares / Amount / Est. cost), each with an expandable **"Why these trades?"** panel explaining the reasoning in plain English, and a total estimated cost.
- A sticky action bar — **"N trades · $X estimated cost"** with **Approve trades** (→ the confirmation step) and **Dismiss**.

### Confirm Trades (the final say)
A review modal before anything is done:

- Trade summary (Asset / Action / Amount) plus **total value traded** and **estimated trading costs**.
- An acknowledgement checkbox — you confirm you understand trades will execute at **market prices** and Equilibrium doesn't guarantee the estimates.
- **Confirm & execute** → you see *"Trades executed"* with the total and cost, a toast, and a fresh trade notification (*"N trades executed successfully. Portfolio rebalanced."*). Your dashboard updates to the new weights immediately.

### Analytics (performance & history)
- **Risk & return cards** — Sharpe ratio, Sortino ratio, Volatility, Max drawdown (click each for a plain-English breakdown).
- **Performance chart** — with a range selector (**1M / 6M / 1Y / All**) and the Benchmark overlay. The chosen range lives in the URL, so views are shareable.
- **Change history** — a compiled timeline under the performance chart of every change you make: rebalances, drift-threshold changes, target-allocation updates, and auto-approve toggles, grouped by Today / Earlier.

### Notifications (your inbox)
Drift alerts, trade confirmations, and system notices — grouped under **Today** and **Earlier**, with unread items highlighted. **Mark all read** clears the batch; the bell in the header shows an amber dot whenever something is unread.

### Settings (your strategy controls)
- **Target allocation** — four sliders (Bonds / US Equity / Intl Equity / Real Estate). They must total **exactly 100%** or saving is blocked ("Allocations must total 100%").
- **Drift threshold** — adjust your tolerance (0.5–20%). Changing it instantly re-baselines the drift zones everywhere.
- **Auto-approve trades under $500** — on/off.
- **Notifications** — email on, push off by default.

### Chat assistant (Equilibrium Assistant)
Floating green button on every signed-in screen. Suggested one-tap questions for a fast demo; replies stream in live and use your real portfolio data. Closing the chat mid-answer stops it cleanly.

---

## 6. A worked example (follow one story end-to-end)

Meet Amara. She set up a **Balanced** portfolio ("Retirement · Index Core") with the default **40% bonds / 40% US / 15% international / 5% real estate** plan and a **3.5% drift threshold**. She owns 6 funds worth **$128,390**.

A year of strong US stocks passes. US shares quietly grow from 40% to **44.5%** of her money — a **+4.5% drift**, beyond her 3.5% tolerance.

1. **She's alerted.** The dashboard gauge shows amber and the banner reads *"Your portfolio has drifted 4.5% from target — Review rebalancing."* A drift notification lands in her inbox.
2. **She sees the plan.** Drift & Rebalance shows each holding's current vs. target weight. US equity shows a red **▲ +4.5% → Sell**; bonds show a green **▼ → Buy**.
3. **She reads the reasons.** The app explains each trade in plain English: *"Reduces total market equity from 44.5% to 40%, matching your balanced target"* — and why the bond purchase helps (*"improving downside protection"*).
4. **She reviews the numbers.** 6 trades, **$5,268** total value traded, in estimated costs, with the "executes at market prices" acknowledgement.
5. **She confirms.** The trades run, her portfolio returns to 40/40/15/5, a *"6 trades executed successfully. Portfolio rebalanced."* notification appears, and the event is logged in her rebalancing history on Analytics.
6. **She checks the performance.** The chart shows her portfolio's growth alongside a stock-market benchmark — line normalized to 100 — and her risk cards (Sharpe, Sortino, volatility, max drawdown) give the full picture.
7. **She asks questions.** "Why is my portfolio drifting?" → Equilibrium Assistant explains drift using *her* actual holdings.

If her rebalance had been small (total under $500) and she'd enabled **auto-approve** in Settings, step 4–5 would have been skipped automatically — but bigger trades always need her say-so.

---

## 7. Quick-reference cheat sheet

### The key numbers
| Item | Value |
|---|---|
| Default drift threshold | **3.5%** |
| Caution zone | threshold → **±8%** (amber) |
| Action zone | **> ±8%** (red) |
| Balanced | within ±0.5% (table shows a neutral "—") |
| Drift gauge range | ±12% |
| Auto-approve cap | **$500** |
| Threshold range (Settings) | 0.5% – 20% |
| Default target allocation | **40 / 40 / 15 / 5** (bonds / domestic / intl / real estate) |
| Password minimum | 8 characters |
| Reset link lifetime | 30 minutes (single-use) |
| Session length | 15 min access / 30 days refresh |
| Rate limit | 10 requests / 60 s per IP |
| Demo login | `demo@equilibrium.app` / `demo1234` |

### The zones in one glance
**Balanced** = close enough (green) · **Caution** = worth fixing (amber) · **Action** = fix it now (red).

### Core logic in one sentence each
- **Drift** = most out-of-line holding, by how many % points (`current − target`).
- **Overweight → Sell · Underweight → Buy**, each sized to land exactly on target.
- **Auto-approve** = total trades ≤ $500 run without review (when enabled).
- **Confirm & execute** = server re-checks the math, can't double-run, logs the event.

### Five self-check questions (test yourself for tomorrow)
1. What problem does Equilibrium solve? → *Portfolios silently drift their risk mix over time; it keeps your money matched to the plan you chose.*
2. How is portfolio drift calculated? → *The single largest |current% − target%| across all your holdings.*
3. What does each colour zone mean? → *Green = within threshold, amber = threshold to 8%, red = over 8%.*
4. When are trades proposed, and what decides buy vs. sell? → *Whenever a holding's drift exceeds the threshold; overweight sells, underweight buys.*
5. Why is a $500 auto-approve the rule? → *Very small rebalances are lower-risk, so they can run automatically by default; anything bigger requires your review.*

---

## 8. The honest bottom line

Equilibrium is a **portfolio-rebalancing product, not a brokerage**. It doesn't buy or sell real securities and it doesn't give personalised investment advice — it teaches, it measures, it recommends, and it keeps your account aligned with the strategy you defined. The demo data, prices, and trades are realistic but illustrative. That's exactly what makes it a safe, well-scoped product to walk a reviewer through.