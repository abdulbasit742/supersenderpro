# Predictive Customer Lifetime Value (CLV)

Projects, **per customer**, how much revenue they're likely to generate over the
next 12 months. This is the number that sets your ceiling on customer
acquisition cost (CAC): if a customer is worth PKR X over a year, you know what
you can afford to spend to win one.

## How it differs from its neighbours

- **Cohort LTV** (cohorts module) = *historical* cumulative revenue, grouped by
  signup month. Backward-looking, by group.
- **RFM** = segments customers into named buckets. No money projection.
- **This** = a *forward* per-individual revenue **prediction**.

## The model (transparent, no ML stack)

```
monthlyRate  = orders / monthsActive          # purchase frequency
aov          = totalSpent / orders            # avg order value
survival     = exp(-recencyMonths / lifespan) # recent buyers more likely to stay
predictedCLV = monthlyRate * aov * horizon * survival
```

`survival` is the key term: a customer who bought heavily but went quiet 10
months ago gets their projection discounted hard, while a recently-active buyer
keeps theirs. Horizon defaults to 12 months, expected lifespan to 18.

Reads `storeCRM` only. Rebuilds nothing. Zero-order customers get CLV 0 (never NaN).

## Run it

```bash
npm run clv:check   # validate the projection math (frequency, AOV, survival) on a fixture
npm run clv:batch   # build snapshot -> public/clv/snapshot.json
```

Dashboard: **`/clv.html`** — predicted-CLV leaderboard + distribution + portfolio total.

## Schedule on PC #2

```cron
21 3 * * *  cd /path/to/supersenderpro && node scripts/clv-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// CLV HOOK
app.use('/api', require('./routes/clvRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/clv/snapshot?horizon=12` | Per-customer CLV + portfolio for one store |
| GET | `/api/clv/all` | All stores |

## Upgrade path

With more order history, the flat survival term can be replaced by a fitted
BG/NBD model — only `engine.scoreCustomer()` changes; everything downstream
stays identical.
