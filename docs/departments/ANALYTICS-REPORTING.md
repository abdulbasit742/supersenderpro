# Feature #9 — Analytics & Reporting

One place to answer "how is the business doing": a single `track()` entry point for events,
time-series + breakdown rollups, funnel conversion analysis, a cross-department KPI snapshot,
CSV export, and scheduled daily/weekly digest reports.

## Why
The app had per-module stats scattered around but no unified analytics layer — no common event
stream, no funnels, no exportable reports, no "email me the numbers every morning". This adds
that as a self-contained, read-only department that sits on top of the others.

## What it does
- **Track events:** `track({ event, value, dimensions })` — one call from anywhere. Stores
  **counts/metrics only**; dimension values that look like emails/phone numbers are redacted
  at ingest (no PII). Retention + a hard cap keep the JSON file bounded.
- **Rollups:** `timeSeries` (day/week/month) and `breakdown` (by any dimension) + `totals`.
- **Funnels:** ordered-step conversion with per-step + overall conversion and drop-off.
- **KPI snapshot:** best-effort, non-fatal pull from billing / support / drip overviews into
  one dashboard payload (each block degrades to null if that department isn't present).
- **CSV export:** dependency-free, RFC-4180-escaped.
- **Digests:** build + (draft) deliver a daily/weekly summary; recorded for history.

## Files
- `lib/analytics/config.js` — env posture (draft digests, retention, cap)
- `lib/analytics/store.js` — atomic JSON store (`data/analytics.json`)
- `lib/analytics/eventTracker.js` — `track()` + PII-safe ingest + retention
- `lib/analytics/rollups.js` — time-series / breakdown / totals
- `lib/analytics/funnel.js` — ordered funnel conversion
- `lib/analytics/kpiSnapshot.js` — cross-department snapshot (non-fatal)
- `lib/analytics/csvExport.js` — dependency-free CSV
- `lib/analytics/notify.js` — single outbound hook (`setNotifier`)
- `lib/analytics/digestBuilder.js` — daily/weekly digest build + deliver
- `lib/analytics/doctor.js` — offline self-check + posture
- `lib/analytics/index.js` — barrel
- `routes/analyticsRoutes.js` — REST surface (`/api/analytics`)
- `scripts/analytics-check.js`, `tests/smoke/analyticsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const analyticsRoutes = require('./routes/analyticsRoutes');
app.use('/api/analytics', analyticsRoutes);
// optional digest delivery: require('./lib/analytics').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
Track events where they happen, e.g.:
```js
require('./lib/analytics').track({ event: 'message_sent', dimensions: { channel: 'whatsapp' } });
```
Schedule a morning digest (node-cron already a dep):
```js
require('node-cron').schedule('0 8 * * *', () => require('./lib/analytics').digestBuilder.run({ period: 'daily', to: OWNER }));
```

## Endpoints (`/api/analytics`)
- `GET /status`, `GET /doctor`, `GET /kpi`
- `POST /track` `{ event, value, dimensions }`
- `GET /timeseries?event=&period=`, `GET /breakdown?event=&dimension=`, `GET /totals?event=`
- `POST /funnel` `{ steps:[...], since?, until? }`
- `GET /export.csv?event=`
- `GET /digests`, `POST /digests/run` `{ period:'daily'|'weekly', to? }`

## Safety
JSON-backed; **counts/metrics only**, PII redacted at ingest. Read-only over other modules.
Digests are **draft-only** until `ANALYTICS_LIVE_DIGESTS=true` + a notifier. 100% additive: no
existing module/route/data changed, no new dependency.

## Env
```
ANALYTICS_ENABLED=true
ANALYTICS_LIVE_DIGESTS=false                # true + notifier => digests actually send
ANALYTICS_MAX_EVENTS=50000
ANALYTICS_RAW_RETENTION_DAYS=90
```

## Verify
```bash
for f in lib/analytics/*.js; do node --check "$f"; done
node --check routes/analyticsRoutes.js
npm run analytics:check
npm run analytics:smoke
```

Feature #9 done. Agle number ka intezaar.
