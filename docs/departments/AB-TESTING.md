# Feature #35 — A/B Testing (Message Experiments)

Test message variants head-to-head and let the data pick the winner. Define 2+ versions of a
message, the engine **stickily** assigns each contact to one, tracks sends + conversions per
variant, and reports conversion rate, lift vs control, and statistical significance.

## Why
The product sends a lot of messages, but every wording/offer was a guess. A/B testing turns
"which subject line / offer / emoji works" into measured fact. It plugs straight into the send
path (broadcast/drip #6/scheduler #17) and uses short-link clicks (#32) or any event as the
conversion signal.

## What it does
- **Define experiments:** `create({ name, metric, variants:[{ label, message, weight, isControl }] })`
  (2+ variants; first is control unless flagged). Weights bias the split (e.g. 90/10).
- **Sticky weighted assignment:** `assignFor(expId, contact)` returns the contact's variant + the
  **message to send**. Assignment is deterministic from `hash(expId+contact)`, so the same
  contact always gets the same variant — and it's persisted for clean unique-exposure counts.
  Records a send by default.
- **Conversion tracking:** `recordConversion(expId, contact)` credits the contact's assigned
  variant (call it when your metric fires, e.g. a short-link click #32 or a purchase).
- **Results:** per-variant conversion rate, **lift vs control**, a **two-proportion z-test**
  (95% default), and an **advisory recommended winner** (best rate, past min sample, significant).
- **Declare winner / stop:** once decided, the experiment serves the winner to everyone.

## Files
- `lib/experiments/config.js` — env posture (min sample, significance z)
- `lib/experiments/store.js` — atomic JSON store (`data/experiments.json`)
- `lib/experiments/assignment.js` — deterministic sticky weighted assignment (hash-based)
- `lib/experiments/stats.js` — conversion rate, lift, two-proportion z-test
- `lib/experiments/experimentEngine.js` — create/assign/convert/results/winner core
- `lib/experiments/doctor.js` — offline self-check + posture
- `lib/experiments/index.js` — barrel
- `routes/experimentsRoutes.js` — REST surface (`/api/experiments`)
- `scripts/experiments-check.js`, `tests/smoke/experimentsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const experimentsRoutes = require('./routes/experimentsRoutes');
app.use('/api/experiments', experimentsRoutes);
```
In the send path, assign + send the variant message:
```js
const ex = require('./lib/experiments');
const a = ex.assignFor(experimentId, contact);   // sticky variant + message, records a send
await waClient.sendMessage(contact, a.message);
```
Credit a conversion when the metric fires (e.g. from the short-link redirect #32):
```js
ex.recordConversion(experimentId, contact);
```

## Endpoints (`/api/experiments`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /experiments` `{ name, metric, variants:[...] }`, `GET /experiments`, `GET /experiments/:id` (+results)
- `GET /experiments/:id/results`
- `POST /experiments/:id/assign` `{ contact, recordSend? }`
- `POST /experiments/:id/convert` `{ contact }`
- `POST /experiments/:id/winner` `{ variantId }`, `POST /experiments/:id/stop`

## Safety
JSON-backed; this module **never sends** — it assigns + scores. Winner declaration is explicit/
advisory (never auto-acts). Contacts are opaque assignment tokens. 100% additive; no existing
module/route/data changed, no new dependency (node crypto).

## Env
```
EXPERIMENTS_ENABLED=true
EXPERIMENTS_MIN_SAMPLE_PER_VARIANT=100
EXPERIMENTS_SIGNIFICANCE_Z=1.96             # ~95% confidence, two-tailed
```

## Verify
```bash
for f in lib/experiments/*.js; do node --check "$f"; done
node --check routes/experimentsRoutes.js
npm run experiments:check
npm run experiments:smoke
```

Feature #35 done. Agle number ka intezaar.
