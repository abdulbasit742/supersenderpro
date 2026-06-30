# Recurring Campaign Scheduler

The drip sequencer (#62) runs per-contact journeys; the send-time optimizer (#21) picks the best hour. This is the other axis: **time-based repeating broadcasts** — \"every Friday 6pm\", \"1st of the month 9am\", \"daily at 10am\" — to a segment. It computes the next run deterministically (timezone-aware), lists due schedules for your queue worker, and advances after each run. Self-hosted Ollama (only if you auto-generate fresh copy per run); zero cloud cost.

## Why

Lots of campaigns are calendar-driven, not behaviour-driven: the weekly offer, the monthly newsletter, the daily flash deal. Setting those up once and letting them recur, safely and on a precise local-time schedule, is pure leverage. It slots in beside drip (event-driven) and one-off broadcasts to cover every send pattern.

## How it works

```
create(freq, time, [days|dayOfMonth], segment, message|autoGenerateGoal)
   freq: once | daily | weekly[days] | monthly[dayOfMonth]
   -> nextRun computed in the schedule\'s timezone (default Asia/Karachi)
scheduler-tick (cron) -> due() lists schedules whose nextRun has passed
worker: resolve segment (#42) -> consent filter (#80) -> send -> POST /ran
   -> markRan increments runCount + computes the next run (or completes once/maxRuns)
```

- **Deterministic next-run math** for daily/weekly/monthly/once, timezone-aware (handles midnight-wrap and DST drift correction).
- **Optional AI copy:** set `autoGenerateGoal` to have the model write fresh copy each run; otherwise a fixed `message` is used. Template fallback offline.
- **Pause/resume, maxRuns, preview** the next N runs.
- **Zero new npm dependencies.**

## Files

- `lib/scheduler/recurringScheduler.js` — create / nextRun / due / markRan / preview.
- `routes/schedulerRoutes.js` — self-mountable router.
- `scripts/scheduler-tick.js` — periodic tick (cron-ready).
- `tests/smoke/schedulerSmoke.js` — offline smoke test + next-run math.

## Wiring it up (one line in server.js)

```js
app.use('/api/scheduler', require('./routes/schedulerRoutes'));
```

## Tick cron (PC #1)

```bash
*/5 * * * *  cd /path/to/supersenderpro && node scripts/scheduler-tick.js >> data/scheduler/tick.log 2>&1
```

The worker, for each due schedule: resolve the segment (#42) to a phone list, run it through consent `filterSendable` (#80), send via the WhatsApp engine (respecting number health #68 caps), then `POST /api/scheduler/ran` to roll forward.

## Environment

```
SCHEDULER_MODEL=qwen2.5:32b   # only when autoGenerateGoal is used
SCHEDULER_TZ=Asia/Karachi
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/scheduler/create` | Define a recurring campaign. Body: `{ id, freq, time, days?, dayOfMonth?, segment?, message?\|autoGenerateGoal?, maxRuns? }` |
| GET | `/api/scheduler/list` | List schedules (next run first) |
| GET | `/api/scheduler/preview?id=&count=` | Next N run times |
| GET | `/api/scheduler/due` | Schedules due to send now |
| POST | `/api/scheduler/ran` | Mark run → resolves copy + rolls forward. Body: `{ id }` |
| POST | `/api/scheduler/pause` \| `/resume` | Pause / resume. Body: `{ id }` |
| DELETE | `/api/scheduler/:id` | Delete a schedule |
| GET | `/api/scheduler/health` | Brain + timezone |

### Example

```bash
curl -X POST localhost:3000/api/scheduler/create -H 'Content-Type: application/json' -d '{
  "id":"fri-deal", "name":"Friday Deal", "freq":"weekly", "time":"18:00", "days":["fri"],
  "segment":"hot leads", "autoGenerateGoal":"promote this week\u2019s weekend discount"
}'
curl 'localhost:3000/api/scheduler/preview?id=fri-deal&count=4'   # next 4 Fridays at 18:00 PKT
```

## Tests

```bash
node tests/smoke/schedulerSmoke.js
```
