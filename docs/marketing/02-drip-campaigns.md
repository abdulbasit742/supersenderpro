# Marketing Automation — Feature #2: Drip Campaigns

Multi-step sequences that run per contact: **send → wait → send → wait → …**. This is the real
executor that `automationWorkflows.js` never had (that file only saved workflows; nothing ran them).

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/dripEngine.js` | Define sequences, enroll contacts, and a `tick()` executor that runs due steps and actually sends. |
| `routes/marketingDripRoutes.js` | CRUD, enroll (explicit or by segment), pause/resume, manual tick. |

## Steps

```json
{
  "name": "Welcome series",
  "segmentId": "SEG-123",
  "steps": [
    { "type": "message", "text": "Hi {{name}}, welcome! 👋" },
    { "type": "wait", "days": 1 },
    { "type": "message", "text": "Here's 10% off your first order: SAVE10" },
    { "type": "wait", "days": 3 },
    { "type": "message", "text": "Still thinking it over? Reply and we'll help." }
  ]
}
```

- `message` steps need `text` and/or `mediaPath`.
- `wait` steps take `minutes` / `hours` / `days`.

## How it runs

1. Enroll contacts (usually a whole **segment** from Feature #1).
2. A periodic `tick()` (cron every minute) walks active enrollments, runs any **due** step, collapses
   waits, sends messages via the injected sender, and marks enrollments `completed` at the end.
3. One failing contact is marked `failed` and skipped; the rest continue.

`tick()` is idempotent per step (no double-sends) and safe to call on an interval.

## API

```
POST   /api/marketing/drips                 create { storeId?, name, steps, segmentId? }
GET    /api/marketing/drips                 list
GET    /api/marketing/drips/:id             fetch + stats
POST   /api/marketing/drips/:id/status      { status: 'active'|'paused' }
POST   /api/marketing/drips/:id/enroll      { contacts: [{ phone, ... }] }
POST   /api/marketing/drips/:id/enroll-segment { segmentId? }   (uses segment resolver)
GET    /api/marketing/drips/:id/enrollments list enrollments
POST   /api/marketing/drips/tick            run the executor once (testing)
```

## Wiring (server.js)

```js
const drip = require('./lib/marketing/dripEngine');

// 1) teach it how to send (reuse the WA client)
drip.setSender(async (contact, { text, mediaPath }) => {
  const to = String(contact.phone).includes('@') ? contact.phone : `${contact.phone}@c.us`;
  if (mediaPath) await waClient.sendMessage(to, await mediaFromPath(mediaPath), { caption: text });
  else await waClient.sendMessage(to, text);
});

// 2) run the executor every minute
require('node-cron').schedule('* * * * *', () => drip.tick().catch(() => {}));

// 3) mount routes, and let enroll-segment pull from Feature #1's segments
const dripRouter = require('./routes/marketingDripRoutes');
dripRouter.setSegmentResolver((segmentId, storeId) => {
  const { resolveSegmentContacts } = require('./lib/marketing/segmentEngine');
  const contacts = loadCrmContacts(storeId);              // your CRM contacts
  return resolveSegmentContacts(segmentId, contacts).contacts;
});
app.use('/api/marketing/drips', dripRouter);
```

## Roadmap position

- #1 Segments ✅
- **#2 Drip campaigns ✅ (this)**
- #3 Broadcast targeting by segment
- #4 Loyalty + referral wiring
- #5 Campaign analytics

## Follow-ups

- Personalisation tokens (`{{name}}`) can reuse the existing `lib/mergeFields.js` renderer in the
  sender. Left to the wiring so it uses your live merge-field logic.
- JSON-backed state today; move `data/marketing_drips.json` to Postgres in the SaaS migration. For
  multi-instance, the executor should take a short lock (Redis) so only one worker ticks at a time.
