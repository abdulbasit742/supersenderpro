# Feature #46 — Customer 360 & Activity Timeline

One screen that answers "who is this contact and what's our whole history with them?" Every
department emits activity events into a unified per-contact timeline; this rolls them into a 360
profile with counts, recency, derived consent, tags, and a 0-100 engagement score.

## Why
Data about a contact was scattered: a click in #32, a payment in #1, a ticket in #3, a survey in
#42, consent in #38. Nobody could see one customer end to end. Customer 360 is the read-side that
stitches it together — the view sales/support open before they reply, and the score segments (#12)
and alerts (#28) can act on.

## What it does
- **track({ contact, type, meta }):** one call records a typed event into the contact's timeline.
  Known types: `message_in/out`, `click`, `payment`, `ticket_opened/resolved`, `survey_response`,
  `nps_promoter/detractor`, `opt_in/opt_out`, `signup`, `abandoned_cart`, `login`, `custom`.
  Counts/metadata only — message bodies + secrets are dropped, phone/email values redacted.
- **profile.build(contact):** first/last seen, recency (days), total + counts by type, payments/
  clicks/tickets/survey tallies, derived consent (from #38 or events), tags (from #12), and the
  engagement score. PII masked.
- **Engagement score (0-100):** per-type weights with **exponential recency decay** (recent
  activity counts more; half-life configurable). An `opt_out` hard-caps the score low. Rated
  hot / warm / cold.
- **Timeline read:** newest-first event list per contact, optionally filtered by type. Per-contact
  event cap keeps the store bounded.

## Files
- `lib/customer360/config.js` — env posture (cap, recency half-life, event weights)
- `lib/customer360/store.js` — atomic JSON store (`data/customer-360.json`)
- `lib/customer360/privacy.js` — contact masking + meta sanitization (drop bodies/secrets)
- `lib/customer360/timeline.js` — track + read events
- `lib/customer360/engagement.js` — recency-decayed 0-100 score
- `lib/customer360/profile.js` — 360 rollup (+ #12/#38 enrichment, non-fatal)
- `lib/customer360/doctor.js` — offline self-check + posture
- `lib/customer360/index.js` — barrel
- `routes/customer360Routes.js` — REST surface (`/api/customer-360`)
- `scripts/customer-360-check.js`, `tests/smoke/customer360Smoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const customer360Routes = require('./routes/customer360Routes');
app.use('/api/customer-360', customer360Routes);
```
Emit events where they happen across the other departments:
```js
const c3 = require('./lib/customer360');
c3.track({ contact: from, type: 'message_in' });                 // inbound message
c3.track({ contact, type: 'payment', meta: { amount } });        // payment fulfilled (#1)
c3.track({ contact, type: 'click', meta: { campaign } });        // short-link click (#32)
c3.track({ contact, type: 'survey_response', meta: { value } }); // survey reply (#42)
```
Then open the 360 view before replying, or feed the score into segments (#12) / alerts (#28).

## Endpoints (`/api/customer-360`)
- `GET /status`, `GET /doctor`
- `POST /track` `{ contact, type, meta }`
- `GET /profile?contact=` — full 360 rollup
- `GET /timeline?contact=&type=&limit=` — newest-first events
- `GET /engagement?contact=` — just the score

## Safety
JSON-backed; **counts/metadata only** (message bodies + secrets dropped at ingest, phone/email
redacted). Contacts masked in every view. Read-side aggregate — this module never sends.
Per-contact cap bounds the store. 100% additive; no existing module/route/data changed, no new
dependency.

## Env
```
CUSTOMER360_ENABLED=true
CUSTOMER360_MAX_EVENTS_PER_CONTACT=500
CUSTOMER360_RECENCY_HALFLIFE_DAYS=14
```

## Verify
```bash
for f in lib/customer360/*.js; do node --check "$f"; done
node --check routes/customer360Routes.js
npm run customer-360:check
npm run customer-360:smoke
```

Feature #46 done. Agle number ka intezaar.
