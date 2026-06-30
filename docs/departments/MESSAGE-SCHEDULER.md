# Feature #17 — Message Scheduler (Scheduled + Recurring Sends)

Schedule a message to go out **later** or **on a repeating schedule** (cron), to a single
contact or a saved segment — timezone-aware, quiet-hours-safe, with retries. The time backbone
that broadcasts, reminders, and reports sit on.

## Why
Drip (#6) handles per-contact journeys, but there was no general "send THIS at 9am Monday" or
"every weekday at noon" scheduler. This adds calendar/cron scheduling as a self-contained dept,
with a dependency-free cron parser and timezone handling via the built-in Intl API.

## What it does
- **One-off jobs:** `schedule({ type:'one_off', runAt, contact|segmentId, message })`.
- **Recurring jobs:** `schedule({ type:'recurring', cron:'0 9 * * 1-5', timezone, ... })` — a
  dependency-free 5-field cron parser (`*`, lists, ranges, steps) with standard dom/dow OR
  semantics.
- **Timezone-aware:** next-run computed in the job's IANA timezone (built-in Intl; no dep).
- **Quiet hours:** due jobs inside the window defer to the window end.
- **Recipients:** a single `contact`, or a saved `segmentId` resolved **consent-safe** via
  `lib/contacts` (#12) when present.
- **Retry/backoff:** failed live sends retry up to `maxRetries` with a backoff delay.
- **Lifecycle:** pause / resume / cancel. Recurring jobs reschedule after each fire; one-offs
  complete.
- **Draft-only** until live sends + a notifier are wired.

## Files
- `lib/messageScheduler/config.js` — env posture (draft default, tz, quiet hours, retries)
- `lib/messageScheduler/store.js` — atomic JSON store (`data/message-scheduler.json`)
- `lib/messageScheduler/privacy.js` — contact masking for views
- `lib/messageScheduler/timezone.js` — Intl-based tz helpers (no dependency)
- `lib/messageScheduler/cron.js` — dependency-free 5-field cron parser + next-run
- `lib/messageScheduler/notify.js` — single outbound hook (`setNotifier`), masks targets
- `lib/messageScheduler/jobEngine.js` — schedule + run + lifecycle core
- `lib/messageScheduler/doctor.js` — offline self-check + posture
- `lib/messageScheduler/index.js` — barrel
- `routes/messageSchedulerRoutes.js` — REST surface (`/api/message-scheduler`)
- `scripts/message-scheduler-check.js`, `tests/smoke/messageSchedulerSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const messageSchedulerRoutes = require('./routes/messageSchedulerRoutes');
app.use('/api/message-scheduler', messageSchedulerRoutes);
// optional: require('./lib/messageScheduler').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
Drive it forward on a schedule (node-cron already a dep):
```js
require('node-cron').schedule('* * * * *', () => require('./lib/messageScheduler').jobEngine.tick());
```

## Endpoints (`/api/message-scheduler`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /jobs` `{ type, runAt|cron, timezone, contact|segmentId, message }`
- `GET /jobs` (`?status=&type=&limit=`), `GET /jobs/:id` (+ recent runs)
- `POST /jobs/:id/pause|resume|cancel`
- `POST /tick` — fire due jobs
- `POST /cron/preview` `{ expr, timezone, count }` — validate + preview next runs

## Safety
JSON-backed; contacts masked in every view. Sends are **draft-only** until
`MESSAGE_SCHEDULER_LIVE_SENDS=true` + a notifier. Quiet hours + retry/backoff protect delivery.
Segment recipients resolved consent-safe via #12. 100% additive; no existing module/route/data
changed, no new dependency (cron + tz are hand-rolled on the stdlib).

## Env
```
MESSAGE_SCHEDULER_ENABLED=true
MESSAGE_SCHEDULER_LIVE_SENDS=false          # true + notifier => jobs actually send
MESSAGE_SCHEDULER_DEFAULT_TZ=Asia/Karachi
MESSAGE_SCHEDULER_QUIET_START_HOUR=22
MESSAGE_SCHEDULER_QUIET_END_HOUR=8
MESSAGE_SCHEDULER_MAX_RETRIES=3
MESSAGE_SCHEDULER_RETRY_BACKOFF_MINUTES=10
```

## Verify
```bash
for f in lib/messageScheduler/*.js; do node --check "$f"; done
node --check routes/messageSchedulerRoutes.js
npm run message-scheduler:check
npm run message-scheduler:smoke
```

Feature #17 done. Agle number ka intezaar.
