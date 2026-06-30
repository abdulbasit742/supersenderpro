# Broadcast Throttle / Safe-Send Queue

Paces broadcast sends so your WhatsApp number never bursts and gets flagged or
banned. This is the dispatch layer that sits between "I want to blast 5,000
people" and the actual send, releasing messages at a safe, human-looking rate.

## Why

WhatsApp flags numbers that send too fast. A safe broadcast is a *paced*
broadcast. This module enforces per-minute / per-hour / per-day caps, skips
non-consented contacts, defers messages outside the recipient's send window,
and holds anything whose number health looks risky.

## How it fits with sibling features

- **#68 Number Health** -> `numberHealthOk(phone)` gate (holds risky sends)
- **#80 Consent** -> `isConsented(phone)` gate (skips at enqueue time)
- **#21 Send-Time** -> `inSendWindow(phone, ts)` gate (defers off-hours)

All three are wired automatically by the router if those modules exist, and the
queue runs fine on its own if they don't.

## Deterministic first, AI optional

The queue is 100% deterministic: caps, windows, gates, jitter. No model needed.
If a local Ollama model is online you can optionally re-order the queue by
predicted engagement, but nothing depends on it.

## API

Mount (does NOT touch `server.js`):

```js
app.use('/api/broadcast-throttle', require('./routes/broadcastThrottleRoutes'));
```

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| POST | `/api/broadcast-throttle/enqueue` | `{ recipients[], payload, template, priority }` | Queue recipients (consent-gated) |
| POST | `/api/broadcast-throttle/dispatch` | `{ dryRun, max, caps }` | Release what the budget allows now |
| GET | `/api/broadcast-throttle/stats` | - | Queue counts by status |
| POST | `/api/broadcast-throttle/reset` | - | Clear queue + counters |

## Caps (env)

| Env | Default | Meaning |
| --- | --- | --- |
| `THROTTLE_PER_MINUTE` | 20 | Max sends / minute |
| `THROTTLE_PER_HOUR` | 400 | Max sends / hour |
| `THROTTLE_PER_DAY` | 5000 | Max sends / day |
| `THROTTLE_JITTER_MS` | 1500 | Random spacing so sends look human |

## Safety

- **Dry-run by default.** `dispatch()` does not actually send unless
  `dryRun: false` AND a real `send` hook is wired by the host app.
- File-backed storage under `data/broadcastThrottle/` (DB-ready later).
- Zero new npm dependencies.

## Typical loop

```js
const tq = require('./lib/broadcastThrottle/throttleQueue');
tq.enqueue(recipients, { template: 'eid-promo' }, hooks);
// run on a timer (e.g. every minute) from your scheduler (#82):
setInterval(() => tq.dispatch({ dryRun: false, caps: {} }, hooks), 60_000);
```

## Test

```bash
node tests/smoke/broadcastThrottleSmoke.js
```
