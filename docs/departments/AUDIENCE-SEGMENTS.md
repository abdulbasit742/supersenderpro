# Feature #9 — Audience Segments: Dynamic Contact Segmentation

Stop blasting everyone. Define **dynamic segments** like "VIPs who spent 5000+", "leads inactive
30+ days", or "Karachi customers tagged wholesale", and feed them straight into broadcasts and
drip journeys. Segments evaluate **live** against your contacts every time they're used, so they
stay fresh without manual list-building.

## Why
Broadcast (#PR36) and drip (#6) both need a target audience, but the only targeting was
"all / by kind / hand-picked ids". There was no way to express "who" by attributes, tags,
activity, or spend. This is that missing audience layer, shared by every send-side feature.

## What it does
- **Rule groups:** a segment is `match: all|any` (AND/OR) over conditions.
- **Fields:** `tag`, `name`, `contact`, `lastActiveDays`, `createdDays`, `totalSpend`, and any
  custom `attr:<key>`.
- **Operators:** eq, neq, contains, not_contains, gt, gte, lt, lte, in, not_in, exists,
  not_exists, has_tag, not_has_tag.
- **Live evaluation:** `preview` (count + masked sample) and `resolve` (capped recipient list
  for sending). `test` runs an unsaved rule set.
- **Pluggable contact source:** auto-detects `lib/storeCRM`; inject your own via `setSource(fn)`.
  **Read-only** over contacts — never copies or mutates them.

## Files
- `lib/audienceSegments/config.js` — env posture (resolve/scan caps)
- `lib/audienceSegments/store.js` — atomic JSON store for segment DEFINITIONS only
- `lib/audienceSegments/privacy.js` — contact masking for previews
- `lib/audienceSegments/contactSource.js` — pluggable read-only contact source (auto-detects storeCRM)
- `lib/audienceSegments/ruleEngine.js` — condition + AND/OR evaluation (pure)
- `lib/audienceSegments/segmentStore.js` — segment definitions CRUD
- `lib/audienceSegments/evaluator.js` — preview / resolve / test
- `lib/audienceSegments/doctor.js` — offline self-check + posture
- `lib/audienceSegments/index.js` — barrel
- `routes/audienceSegmentsRoutes.js` — REST surface (`/api/audience-segments`)
- `scripts/audience-segments-check.js`, `tests/smoke/audienceSegmentsSmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const audienceSegmentsRoutes = require('./routes/audienceSegmentsRoutes');
app.use('/api/audience-segments', audienceSegmentsRoutes);
// optional: point it at your real contact list if it isn't storeCRM-shaped:
// require('./lib/audienceSegments').setSource(async () => myContactArray);
```
Use a segment to target a broadcast (ties into PR #36 broadcastHub):
```js
const { recipients } = await require('./lib/audienceSegments').evaluator.resolve('seg-vip');
broadcastHub.sendToAll({ message, targets: { ids: recipients.map(r => r.contact) } });
```
Or to enroll a segment into a drip journey (#6):
```js
for (const r of recipients) dripCampaigns.enrollmentEngine.enrollManual('jny-winback', { contact: r.contact, name: r.name });
```

## Endpoints (`/api/audience-segments`)
- `GET /status`, `GET /doctor`
- `GET /segments`, `GET /segments/:id`, `POST /segments`, `POST /segments/:id/active`
- `GET /segments/:id/preview` (`?sample=`), `GET /segments/:id/resolve` (`?limit=`)
- `POST /test` `{ match, conditions }` — evaluate an unsaved rule set

## Safety
Read-only over contacts; only segment definitions are persisted. Previews mask all contacts.
Resolve is capped (`AUDIENCE_SEGMENTS_MAX_RESOLVE_SIZE`) and scans are capped (`..._MAX_SCAN`).
100% additive: no existing module/route/data changed, no new dependency.

## Env
```
AUDIENCE_SEGMENTS_ENABLED=true
AUDIENCE_SEGMENTS_MAX_RESOLVE_SIZE=100000
AUDIENCE_SEGMENTS_MAX_SCAN=500000
```

## Verify
```bash
for f in lib/audienceSegments/*.js; do node --check "$f"; done
node --check routes/audienceSegmentsRoutes.js
npm run audience-segments:check
npm run audience-segments:smoke
```

Feature #9 done. Agle number ka intezaar.
