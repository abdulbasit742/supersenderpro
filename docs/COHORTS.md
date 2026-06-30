# Cohort Retention & LTV

Revenue totals hide the most important question for a subscription/repeat
business: **are the customers you acquire this month stickier or worse than the
ones from three months ago?** This groups customers by acquisition month and
tracks how each cohort behaves over time. It's the "cohort/retention" slice of
the PC #2 overnight batch.

## What it does

- **Cohort** = everyone whose *first* order happened in a given calendar month.
- **Retention[m]** = % of that cohort who ordered again `m` months later (M0 is always 100%).
- **LTV[m]** = cumulative average revenue per cohort member through month `m`.
- **Trend** = compares M1 retention of newer cohorts vs older ones — a single number telling you if your product/onboarding is getting stickier.

Reads `storeCRM` order interactions only. Rebuilds nothing. Customers with order
totals but no dated events fall back to their first-contact month so they're not
dropped.

## The classic heatmap

The dashboard renders the standard cohort triangle: rows = signup month, columns
= months since signup, cell = retention %, colour-graded so decay (or a sticky
cohort that bucks the trend) jumps out instantly. Plus cumulative LTV curves per
cohort so you can see which months produced the most valuable customers.

## Run it

```bash
npm run cohorts:check   # validate install + retention/LTV math on a fixture
npm run cohorts:batch   # build snapshot -> public/cohorts/snapshot.json
```

Dashboard: **`/cohorts.html`**.

## Schedule on PC #2

```cron
20 3 * * *  cd /path/to/supersenderpro && node scripts/cohorts-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// COHORTS HOOK
app.use('/api', require('./routes/cohortsRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/cohorts/snapshot` | Cohorts + retention + LTV for one store |
| GET | `/api/cohorts/all` | All stores |

## Upgrade path

When Postgres lands, `lib/cohorts/index.js`'s `collectOrders()` reads from SQL
instead of the JSON interaction log — the cohort math in `cohortEngine.js` stays
identical.
