# Analytics & Insights (the "dimagh")

One dashboard where the founder sees everything: **revenue, conversion rates,
channel performance, and churn prediction**. The heavy computation runs in the
**PC #2 overnight batch**, so the live app stays light.

## What it answers

- **Revenue** — lifetime, last 7d / 30d, week-over-week growth, MRR/ARR, AOV, ARPU, 30-day trend.
- **Conversion** — Contacts → Engaged → Ordered → Repeat funnel, lead-to-customer %, free-to-paid %.
- **Channel performance** — customers, revenue, conversion and revenue-share per acquisition source.
- **Churn prediction** — per-customer RFM churn-risk score, high/medium/low bands, predicted churn rate, revenue-at-risk, and a "save these first" list of high-value customers slipping away.

## Architecture

```
data/ (JSON)  ──▶  lib/analyticsInsights/        ──▶  scripts/analytics-batch.js  ──▶  public/analytics/insights.json
 store_crm/*        dataSources  (read-only)            (run on PC #2, overnight)        (served statically)
 subscription_*     analyticsEngine (revenue/conv/chan)                                          │
 txn_store          churnModel (RFM churn prediction)                                            ▼
                    index (buildAllSnapshot)                                      public/founder-analytics.html
```

The dashboard reads a **pre-computed static snapshot**, so it adds zero load to
the live server and works even when the app is busy. It degrades gracefully:
real snapshot → committed demo sample → live API.

When the Postgres migration lands (roadmap Phase 1), only `lib/analyticsInsights/dataSources.js` changes.

## Running it

```bash
# Compute the snapshot now (writes public/analytics/insights.json)
npm run analytics:batch

# Validate the install + pipeline
npm run analytics-insights:check
```

Open **`/founder-analytics.html`** in the app.

## Schedule on PC #2 (overnight batch box)

Linux cron, 3am nightly:

```cron
0 3 * * *  cd /path/to/supersenderpro && /usr/bin/node scripts/analytics-batch.js >> /var/log/analytics-batch.log 2>&1
```

Or in-process with the already-installed `node-cron`:

```js
require('node-cron').schedule('0 3 * * *', require('./scripts/analytics-batch').run);
```

Daily history is kept in `data/analytics/history/<date>.json` for trend tracking.

## Live API (optional)

The dashboard does **not** need the live API — it's only for always-fresh,
on-demand queries. To wire it into `server.js`, add next to the other
`app.use('/api', ...)` route mounts:

```js
// ANALYTICS INSIGHTS HOOK
app.use('/api', require('./routes/analyticsInsightsRoutes')());
```

Endpoints (all read-only, `?storeId=` optional, defaults to `default_store`):

| Method | Path | Returns |
|---|---|---|
| GET | `/api/analytics-insights/all` | Workspace-wide snapshot (all stores) |
| GET | `/api/analytics-insights/snapshot` | Full snapshot for one store |
| GET | `/api/analytics-insights/revenue` | Revenue block |
| GET | `/api/analytics-insights/conversion` | Conversion block |
| GET | `/api/analytics-insights/channels` | Channel performance |
| GET | `/api/analytics-insights/churn` | Churn prediction |

## Churn model

Transparent, dependency-free RFM scoring (recency / frequency / monetary) squashed
through a logistic function into a 0–100 risk score, with human-readable reasons.
No Python/ML stack required — it runs anywhere. When enough labelled history
exists, the hand-tuned weights in `churnModel.scoreCustomer()` can be replaced
with coefficients fitted on PES's own data without changing anything downstream.
