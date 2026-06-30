# Founder Insights Digest & Report (Command Center)

The **capstone** of the analytics suite. Every other module answers one
question; this rolls all of them into **one page and one daily report**: a
plain-language narrative, a prioritised "do this today" list, the headline KPIs,
live status of every module, and an exportable founder report (HTML/PDF + CSV).

## What it pulls together

| Module | Contributes |
|---|---|
| Analytics & Insights | revenue, MRR, conversion, top channel |
| Forecast | next-30-day projection + range |
| Churn | predicted churn %, revenue at risk, save-list |
| Win-Back | today's targets + revenue at risk targeted |
| A/B Testing | running + decided experiments |
| Attribution | top opener vs top closer, multi-touch share |
| Cohorts | M1 retention + trend |
| Alerts | open critical/warning counts |

**Fault-tolerant by design:** each source goes through an adapter that returns
`{ available: false }` if the module is missing or errors — the digest never
crashes and the page shows which modules are live vs not. It **rebuilds nothing**;
it only stitches the other modules' outputs (the workspace's "command above the
layer, not beside it" pattern).

## The report

`/api/digest/report?format=html` renders a clean, **print-to-PDF-ready** founder
report (open it, Ctrl/Cmd-P, save as PDF). `?format=csv` gives a flat metrics
table for spreadsheets. No PDF dependency pulled in — HTML keeps it styleable,
dependency-free, and proxy-safe. The batch also drops a ready HTML report per
store at `public/digest/reports/<storeId>.html`.

## Run it

```bash
npm run digest:check   # validate roll-up + report exporters (works with zero data)
npm run digest:batch   # build combined digest + per-store reports
```

Dashboard: **`/insights-digest.html`** — the one page to open each morning.

## Full PC #2 overnight schedule

The digest runs **last**, after every module has written its snapshot:

```cron
0  3 * * *  cd /path/to/supersenderpro && node scripts/analytics-batch.js
15 3 * * *  cd /path/to/supersenderpro && node scripts/attribution-batch.js
20 3 * * *  cd /path/to/supersenderpro && node scripts/cohorts-batch.js
25 3 * * *  cd /path/to/supersenderpro && node scripts/forecast-batch.js
30 3 * * *  cd /path/to/supersenderpro && REENGAGE_LIVE=false node scripts/reengage-batch.js
35 3 * * *  cd /path/to/supersenderpro && node scripts/alerts-batch.js
40 3 * * *  cd /path/to/supersenderpro && node scripts/digest-batch.js
45 3 * * *  cd /path/to/supersenderpro && node scripts/experiments-batch.js
```

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// DIGEST HOOK
app.use('/api', require('./routes/digestRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/digest` | Combined digest for one store |
| GET | `/api/digest/all` | All stores |
| GET | `/api/digest/report?format=html\|csv` | Downloadable founder report |

## Why a digest on top of dashboards

A founder with no time won't open seven dashboards every morning. They'll open
**one** that says "here's the story, here's what to do, here's the report to
forward." That's this. The seven modules stay independent and mergeable on their
own; this is the layer that makes them feel like one product.
