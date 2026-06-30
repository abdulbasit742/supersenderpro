# Feature #35 — A/B Testing (Message Experiments)

Test two (or more) message versions against each other and let the data pick the winner. Define
an experiment with weighted variants, the engine deterministically assigns each contact to a
variant, you send that variant's body, and conversions (reply / click / purchase) roll up into
per-variant rates with an automatic winner.

## Why
The product sends a lot of messages but had no way to learn which copy actually works. A/B
testing turns sending into a feedback loop — the single highest-leverage way to lift reply and
conversion rates over time. It composes with everything that sends (drip #6, scheduler #17,
broadcast) and everything that measures (analytics #9, short-link clicks #32).

## What it does
- **Experiments + variants:** `create({ name, goal, variants:[{id,label,body,weight}] })` (>=2).
- **Deterministic assignment:** `variantFor(expId, contact)` maps a contact to a variant via a
  stable SHA-256 hash of `expId:contact` -> weighted bucket. The **same contact always gets the
  same variant** (no flip-flop across sends), and the decision needs no per-contact storage.
- **Send the variant body:** the returned `body` is what you send (run merge fields / links on it).
- **Conversions:** `recordConversion(expId, contact)` credits the contact's assigned variant
  (idempotent per contact; rejects never-assigned contacts).
- **Winner heuristic:** per-variant rate = conversions/assigned. A winner is declared only when
  every variant has >= `minSamplePerVariant` and the leader beats the runner-up by >=
  `minRateGapPct` points. `stop()` locks the winner and routes all future sends to it.

## Files
- `lib/abTesting/config.js` — env posture (sample + rate-gap thresholds)
- `lib/abTesting/store.js` — atomic JSON store (`data/ab-testing.json`)
- `lib/abTesting/assign.js` — deterministic weighted assignment (stable hash)
- `lib/abTesting/stats.js` — per-variant rates + winner heuristic
- `lib/abTesting/experimentEngine.js` — create/variantFor/recordConversion/stop/archive core
- `lib/abTesting/doctor.js` — offline self-check + posture
- `lib/abTesting/index.js` — barrel
- `routes/abTestingRoutes.js` — REST surface (`/api/ab-testing`)
- `scripts/ab-testing-check.js`, `tests/smoke/abTestingSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const abTestingRoutes = require('./routes/abTestingRoutes');
app.use('/api/ab-testing', abTestingRoutes);
```
At send time, pick the variant body for the contact:
```js
const ab = require('./lib/abTesting');
const v = ab.variantFor(experimentId, to);    // deterministic variant + body
await waClient.sendMessage(to, v.body);        // (run merge fields / #32 links on v.body first)
```
Credit a conversion when the goal happens (reply handler / #32 click / #1 payment):
```js
ab.recordConversion(experimentId, contact);
```

## Endpoints (`/api/ab-testing`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /experiments` `{ name, goal, variants }`, `GET /experiments`, `GET /experiments/:id`
- `POST /experiments/:id/variant` `{ contact }` — deterministic variant + body
- `POST /experiments/:id/convert` `{ contact }` — record a conversion
- `POST /experiments/:id/stop` `{ winnerId? }`, `POST /experiments/:id/archive`

## Safety
JSON-backed; **decides + measures only, never sends**. Contacts are used as a hash input +
assignment key; views expose counts, not raw contacts. Winner needs real sample + a real gap
(no premature calls). Experiments archived, never hard-deleted. 100% additive; no existing
module/route/data changed, no new dependency (node crypto).

## Env
```
AB_TESTING_ENABLED=true
AB_TESTING_MIN_SAMPLE=30                  # min assignments per variant before a winner
AB_TESTING_MIN_RATE_GAP_PCT=5            # leader must beat runner-up by this many points
```

## Verify
```bash
for f in lib/abTesting/*.js; do node --check "$f"; done
node --check routes/abTestingRoutes.js
npm run ab-testing:check
npm run ab-testing:smoke
```

Feature #35 done. Agle number ka intezaar.
