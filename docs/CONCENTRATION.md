# Revenue Concentration / Customer Dependency Risk

The risk question none of the other modules ask: **how exposed is the business
if a few big customers walk?** A business where one customer is 50% of revenue
is fragile, even if revenue looks great today.

## What it does

From each customer's total spend, computes:

- **Top-N share** — % of revenue from the top 1 / 5 / 10 / 20 customers
- **Single-buyer exposure** — % from the single biggest customer (the "if they leave" number)
- **Gini coefficient** — 0 (revenue perfectly even across customers) → 1 (one customer is everything)
- **HHI** (Herfindahl-Hirschman Index) — sum of squared revenue shares; **> 0.25 = concentrated**
- a plain **risk verdict** (low / moderate / high) with a one-line "what to do"

Plus a **Lorenz curve** for the dashboard: the further it bows below the equality
line, the more concentrated your revenue.

## How it differs from neighbours

- **CLV** = each customer's forward value.
- **RFM** = which segment each customer is in.
- **Concentration** = the *shape* of the whole revenue distribution + dependency risk. A portfolio-level question, not a per-customer one.

Reads `storeCRM` only. Rebuilds nothing.

## Run it

```bash
npm run concentration:check   # validate Gini/HHI/top-N on known fixtures
npm run concentration:batch   # build snapshot -> public/concentration/snapshot.json
```

Dashboard: **`/concentration.html`** — risk gauge, top-N bars, Lorenz curve.

## Schedule on PC #2

```cron
26 3 * * *  cd /path/to/supersenderpro && node scripts/concentration-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// CONCENTRATION HOOK
app.use('/api', require('./routes/concentrationRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/concentration/snapshot` | Concentration metrics + Lorenz for one store |
| GET | `/api/concentration/all` | All stores |

## Pairs with

High concentration + a high-CLV customer showing churn risk = your single most
urgent retention action. This module tells you *how much it would hurt*; churn
tells you *who's at risk*; together they rank what to protect first.
