# Marketing Automation — Feature #2: Drip Campaigns

Builds directly on [#1 Segments](01-segments.md). A **drip** is a sequence that runs per contact:
send a message, wait, send the next, and so on. This is the real executor `automationWorkflows.js`
never had — it stored workflows but never ran them.

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/dripEngine.js` | Define sequences, enroll contacts, and `tick()` to advance + send. |
| `routes/marketingDripRoutes.js` | Create/list, activate, enroll (by contacts or segment), stop, stats, manual tick. |

## Step shapes

```json
{
  "name": "Welcome series",
  "status": "active",
  "steps": [
    { "type": "message", "text": "Hi {{name}}, welcome! 👋" },
    { "type": "wait", "hours": 24 },
    { "type": "message", "text": "Here's 10% off your first order: SAVE10" },
    { "type": "wait", "days": 3 },
    { "type": "message", "text": "Still thinking it over? Reply and I'll help." }
  ]
}
```

## How it runs

1. **Enroll** contacts into an active drip (usually a whole segment from #1).
2. A scheduler calls **`tick()`** every minute. Each tick advances every enrollment whose next step
   is due: message steps send now, wait steps schedule the following step.
3. A contact that reaches the end is marked `completed`. Unsubscribe/convert -> `stopContact()`.

Ticks are safe to run repeatedly and never abort the batch on one failed send (the error is recorded
on that contact's run and it moves on).

## Wiring (server.js)

```js
const dripEngine = require('./lib/marketing/dripEngine');

// 1) Route drip messages through the broadcast hub (or the WA client directly):
dripEngine.setSender(async (contact, { text, mediaPath }) =>
  broadcastHub.sendToAll({ message: text, mediaPath, targets: { ids: [contact.phone] } }));

// 2) Mount routes; optionally let enroll accept a segmentId:
const dripRouter = require('./routes/marketingDripRoutes');
dripRouter.setSegmentResolver((segmentId) => {
  const seg = require('./lib/marketing/segmentEngine').getSegment(segmentId);
  return seg ? require('./lib/marketing/segmentEngine')
    .resolveSegmentContacts(segmentId, loadCrmContacts(seg.storeId)).contacts : [];
});
app.use('/api/marketing/drips', dripRouter);

// 3) Run the executor every minute:
require('node-cron').schedule('* * * * *', () => dripEngine.tick().catch(() => {}));
```

## API

```
GET  /api/marketing/drips              list
POST /api/marketing/drips              create { name, steps, segmentId?, status? }
GET  /api/marketing/drips/:id          fetch one + stats
POST /api/marketing/drips/:id/status   { status: 'active'|'paused'|'draft' }
POST /api/marketing/drips/:id/enroll   { contacts:[...] } or { segmentId }
POST /api/marketing/drips/:id/stop     { phone }
GET  /api/marketing/drips/:id/stats    enrollment stats
POST /api/marketing/drips/tick         manual executor run (testing)
```

## Roadmap status

- #1 Segments ✅
- **#2 Drip campaigns ✅ (this)**
- #3 Broadcast targeting by segment — next
- #4 Loyalty + referral wiring
- #5 Campaign analytics

## Follow-ups

- `{{name}}` style merge tags: reuse `lib/mergeFields.js` in the sender so step text personalises.
- JSON-backed now; move `marketing_drips.json` + `marketing_drip_runs.json` to Postgres in the SaaS
  migration. The executor pattern (a periodic `tick`) ports cleanly to a DB-backed job queue later.
