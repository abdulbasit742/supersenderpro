# Marketing Automation — Feature #3: Broadcast to a Segment

Pick a segment (Feature #1), write one message, and it goes to exactly the contacts matching that
segment **right now**. This connects the marketing department to the one-click broadcast hub
(`lib/broadcastHub.js`, PR #36).

## What shipped

| File | Purpose |
|------|---------|
| `lib/marketing/segmentBroadcast.js` | Resolve a segment to recipients, then fan out via the broadcast hub. |
| `routes/marketingSegmentBroadcastRoutes.js` | Preview + send API. |

## Flow

```
segment (rules)  ->  matching contacts  ->  wa ids  ->  broadcastHub.sendToAll({ targets: { ids } })
```

Membership is computed at send time, so the audience is never stale. The hub still owns throttling
(per-recipient delay), media handling, and logging — so this stays a thin bridge.

## API

```
GET  /api/marketing/segment-broadcast/:segmentId/preview?storeId=&limit=   who/how many would get it
POST /api/marketing/segment-broadcast/:segmentId/send                     { message, mediaPath?, storeId?, delayMs? }
```

## Wiring (server.js)

```js
const segBroadcast = require('./lib/marketing/segmentBroadcast');
segBroadcast.setContactLoader((storeId) => loadCrmContacts(storeId)); // same CRM source as segments
app.use('/api/marketing/segment-broadcast', require('./routes/marketingSegmentBroadcastRoutes'));
```

Requires the broadcast hub to already have its WA client (`broadcastHub.setWhatsAppClient(waClient)`
from PR #36) and the segments contact loader.

## Roadmap position

- #1 Segments ✅
- #2 Drip campaigns ✅
- **#3 Broadcast targeting by segment ✅ (this)**
- #4 Loyalty + referral wiring
- #5 Campaign analytics

## Follow-up

When campaign analytics (#5) lands, record each segment broadcast as a campaign run so opens/clicks
roll up per segment.
