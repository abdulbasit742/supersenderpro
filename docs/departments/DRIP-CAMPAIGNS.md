# Feature #6 — Drip Campaigns: Automated Follow-up Journeys

Turn one-off blasts into **automated, event-triggered sequences**: a contact signs up → gets a
welcome series; abandons a cart → gets a nudge an hour later; pays → gets onboarding (and is
pulled out of the sales-chase journey). This is the journey/sequence engine that ties the
existing broadcast + lead-gen + billing events together.

## Why
SuperSender could broadcast and capture leads, but there was no concept of a *journey* — no
way to say "on event X, send this, wait 1 day, send that, stop if they pay". Recurring revenue
lives in follow-up. This adds it, self-contained.

## What it does
- **Define journeys:** ordered steps, each with a `waitMinutes` delay + a `{{merge}}` message.
- **Triggers:** `signup`, `abandoned_cart`, `payment_success`, `inactivity`, `manual`.
- **Enroll via events:** `handleEvent({event, contact, name, context})` enrolls into every
  active journey for that trigger. Per-contact-per-journey **dedupe** (no double enrollment).
- **Stop conditions:** a journey's `stopOnEvent` unenrolls active runs (e.g. stop the
  abandoned-cart chase once `payment_success` fires).
- **Advance on a tick:** `tick()` sends every due step, respecting **quiet hours** and a
  **daily per-contact cap**, then schedules the next step.
- **Draft-only** until live sends + a notifier are wired.

## Files
- `lib/dripCampaigns/config.js` — env posture (draft-only default, quiet hours, daily cap)
- `lib/dripCampaigns/store.js` — atomic JSON store (`data/drip-campaigns.json`)
- `lib/dripCampaigns/privacy.js` — contact masking for views
- `lib/dripCampaigns/mergeRender.js` — `{{merge}}` rendering (no token leaks)
- `lib/dripCampaigns/journeyStore.js` — journey definitions CRUD
- `lib/dripCampaigns/notify.js` — single outbound hook (`setNotifier`), masks targets
- `lib/dripCampaigns/enrollmentEngine.js` — enrollment + step advancement core
- `lib/dripCampaigns/doctor.js` — offline self-check + posture
- `lib/dripCampaigns/index.js` — barrel
- `routes/dripCampaignsRoutes.js` — REST surface (`/api/drip-campaigns`)
- `scripts/drip-campaigns-check.js`, `tests/smoke/dripCampaignsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const dripCampaignsRoutes = require('./routes/dripCampaignsRoutes');
app.use('/api/drip-campaigns', dripCampaignsRoutes);
// optional: require('./lib/dripCampaigns').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
Fire events where they happen, e.g.:
```js
require('./lib/dripCampaigns').enrollmentEngine.handleEvent({ event: 'signup', contact: phone, name });
```
Drive it forward on a schedule (node-cron is already a dep):
```js
require('node-cron').schedule('* * * * *', () => require('./lib/dripCampaigns').enrollmentEngine.tick());
```

## Endpoints (`/api/drip-campaigns`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `GET /journeys`, `GET /journeys/:id`, `POST /journeys`, `POST /journeys/:id/active`
- `POST /event` `{ event, contact, name, context }`
- `POST /journeys/:id/enroll` `{ contact, name, context }`
- `GET /enrollments` (`?journeyId=&status=&limit=`), `POST /enrollments/:id/stop`
- `POST /tick` — advance due steps

## Safety
JSON-backed; contacts masked in every view. Steps are **draft-only** until
`DRIP_CAMPAIGNS_LIVE_SENDS=true` and a notifier is wired. Quiet hours + a daily per-contact
cap prevent spamming. 100% additive: no existing module/route/data changed, no new dependency.

## Env
```
DRIP_CAMPAIGNS_ENABLED=true
DRIP_CAMPAIGNS_LIVE_SENDS=false             # true + notifier => steps actually send
DRIP_CAMPAIGNS_MAX_STEPS_PER_CONTACT_PER_DAY=5
DRIP_CAMPAIGNS_QUIET_START_HOUR=22
DRIP_CAMPAIGNS_QUIET_END_HOUR=8
```

## Verify
```bash
for f in lib/dripCampaigns/*.js; do node --check "$f"; done
node --check routes/dripCampaignsRoutes.js
npm run drip-campaigns:check
npm run drip-campaigns:smoke
```

Feature #6 done. Agle number ka intezaar.
