# Feature #28 — Notifications & Alerts

Turn important internal events into **alerts**: SLA breached, payment received, a send failed, a
tenant blew past its quota. Rules decide what matters, where it goes (in-app feed + owner
notification), and how often — so the owner hears about problems before customers do.

## Why
The app does a lot, but nothing surfaced "something needs your attention" in one place. Analytics
(#9) is pull (you go look); this is **push** (it comes to you). It's the connective tissue: other
departments just call `emit(event, payload)` and the alert center decides the rest.

## What it does
- **Rule-based:** a rule = `{ event, condition?, severity, channels, throttleMinutes, template }`.
  Ships **default rules** for `sla.breach`, `payment.succeeded`, `send.failed`, `usage.exceeded`.
- **Safe conditions:** a JSON rule tree (`all`/`any` of leaf comparisons over the event payload,
  dotted paths, ops eq/neq/contains/exists/gt/lt/gte/lte/in). **No eval, no code execution.**
- **Channels:** `inapp` (always recorded to a feed) + `owner` (pluggable notifier; draft-only
  until live delivery + a notifier are wired).
- **Throttle/dedupe:** per-rule window keyed by a stable discriminator (ticket/target/tenant) so
  one flapping problem doesn't spam you.
- **Severity:** info / warning / critical, with feed counts + an unread **digest**.

## Files
- `lib/alertCenter/config.js` — env posture (draft owner delivery, throttle, feed cap)
- `lib/alertCenter/store.js` — atomic JSON store (`data/alert-center.json`)
- `lib/alertCenter/conditionMatcher.js` — safe JSON condition evaluation (no eval)
- `lib/alertCenter/ruleStore.js` — rule CRUD + seeded defaults
- `lib/alertCenter/notify.js` — single outbound hook (`setNotifier`), masks target
- `lib/alertCenter/alertEngine.js` — emit + match + throttle + feed + digest core
- `lib/alertCenter/doctor.js` — offline self-check + posture
- `lib/alertCenter/index.js` — barrel
- `routes/alertCenterRoutes.js` — REST surface (`/api/alerts`)
- `scripts/alert-center-check.js`, `tests/smoke/alertCenterSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const alertCenterRoutes = require('./routes/alertCenterRoutes');
app.use('/api/alerts', alertCenterRoutes);
// optional owner delivery: require('./lib/alertCenter').setNotifier(async (to,msg)=>waClient.sendMessage(OWNER, msg));
```
Emit from other departments where the event happens, e.g.:
```js
require('./lib/alertCenter').emit('sla.breach', { ticket: t.number, priority: t.priority });
require('./lib/alertCenter').emit('payment.succeeded', { amount, currency, plan });
require('./lib/alertCenter').emit('send.failed', { target, reason });
```
Great with #3 (SLA breach), #1 (payments), #6/#17 (send failures), billing usage (#9-style).

## Endpoints (`/api/alerts`)
- `GET /status`, `GET /doctor`, `GET /overview`, `GET /digest`
- `POST /emit` `{ event, payload }`
- `GET /feed` (`?severity=&event=&unreadOnly=&limit=`), `POST /feed/:id/read`, `POST /feed/read-all`
- `GET /rules`, `POST /rules`, `POST /rules/:id/active`, `DELETE /rules/:id`

## Safety
JSON-backed; in-app feed always recorded, **owner delivery draft-only** until
`ALERT_CENTER_LIVE_DELIVERY=true` + a notifier. Conditions are JSON (no eval). Throttling prevents
alert storms. 100% additive; no existing module/route/data changed, no new dependency.

## Env
```
ALERT_CENTER_ENABLED=true
ALERT_CENTER_LIVE_DELIVERY=false            # true + notifier => owner alerts actually send
ALERT_CENTER_DEFAULT_THROTTLE_MINUTES=15
ALERT_CENTER_MAX_FEED=5000
```

## Verify
```bash
for f in lib/alertCenter/*.js; do node --check "$f"; done
node --check routes/alertCenterRoutes.js
npm run alert-center:check
npm run alert-center:smoke
```

Feature #28 done. Agle number ka intezaar.
