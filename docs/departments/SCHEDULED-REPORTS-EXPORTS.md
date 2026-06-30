# Feature #40 — Scheduled Reports & Exports

Set up a report once ("every Monday 8am, email me the KPIs as CSV") and it builds + delivers
itself. Pulls point-in-time snapshots from the other departments' overviews, renders CSV or JSON,
archives every run, and (draft-only) delivers to a recipient.

## Why
Analytics #9 gives a live snapshot you go look at; the scheduler #17 sends messages to customers.
Neither does "build a business report on a schedule and send it to the owner/finance". This is the
reporting-automation layer — the thing that lands a CSV in your inbox every morning without anyone
clicking.

## What it does
- **Define reports:** `create({ name, sources:[...], format:'csv'|'json', schedule:'0 8 * * 1', timezone, recipient })`.
- **Sources:** pulls from `analytics` #9, `billing`, `support` #3, `drip` #6, `links` #32,
  `sender_health` #30, `consent` #38 overviews. **Non-fatal** — missing depts degrade to null, the
  report still builds from what's present.
- **Run:** `run(id)` builds a point-in-time snapshot, renders it (JSON = full snapshot; CSV =
  flattened `source,key,value` rows), archives the run (content + size + which sources were
  available), and **draft-delivers** to the recipient.
- **Schedule:** `runDue()` runs every active report whose `nextRunAt` is due; cron parsing +
  next-run reuse lib/messageScheduler #17 when present. Drive it from node-cron.
- **Download:** every archived run is downloadable as its CSV/JSON file.

## Files
- `lib/scheduledReports/config.js` — env posture (draft delivery, runs retained, sources/formats)
- `lib/scheduledReports/store.js` — atomic JSON store (`data/scheduled-reports.json`)
- `lib/scheduledReports/csv.js` — dependency-free CSV (rows + object->key/value)
- `lib/scheduledReports/sources.js` — non-fatal snapshot collectors per department
- `lib/scheduledReports/notify.js` — single delivery hook (`setNotifier`)
- `lib/scheduledReports/reportEngine.js` — define/run/runDue/archive/download core
- `lib/scheduledReports/doctor.js` — offline self-check + which sources are wired
- `lib/scheduledReports/index.js` — barrel
- `routes/scheduledReportsRoutes.js` — REST surface (`/api/scheduled-reports`)
- `scripts/scheduled-reports-check.js`, `tests/smoke/scheduledReportsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const scheduledReportsRoutes = require('./routes/scheduledReportsRoutes');
app.use('/api/scheduled-reports', scheduledReportsRoutes);
// optional delivery: require('./lib/scheduledReports').setNotifier(async (to, { subject, attachment, attachmentName }) => {
//   // e.g. email the attachment, or send a WhatsApp doc; your call
// });
```
Drive schedules (node-cron already a dep):
```js
require('node-cron').schedule('* * * * *', () => require('./lib/scheduledReports').reportEngine.runDue());
```

## Endpoints (`/api/scheduled-reports`)
- `GET /status`, `GET /doctor`, `GET /overview`, `GET /sources`
- `POST /reports` `{ name, sources, format, schedule?, timezone?, recipient? }`, `GET /reports`, `GET /reports/:id` (+runs)
- `POST /reports/:id/active`, `POST /reports/:id/run`, `POST /run-due`
- `GET /reports/:id/runs`, `GET /runs/:runId/download`

## Safety
JSON-backed; reports built + archived always, **external delivery draft-only** until
`SCHEDULED_REPORTS_LIVE_DELIVERY=true` + a notifier. Sources are read-only + non-fatal. Run history
capped per report. 100% additive; no existing module/route/data changed, no new dependency (cron
reused from #17 when present, else manual runs work).

## Env
```
SCHEDULED_REPORTS_ENABLED=true
SCHEDULED_REPORTS_LIVE_DELIVERY=false        # true + notifier => built reports actually deliver
SCHEDULED_REPORTS_MAX_RUNS=50
```

## Verify
```bash
for f in lib/scheduledReports/*.js; do node --check "$f"; done
node --check routes/scheduledReportsRoutes.js
npm run scheduled-reports:check
npm run scheduled-reports:smoke
```

Feature #40 done. Agle number ka intezaar.
