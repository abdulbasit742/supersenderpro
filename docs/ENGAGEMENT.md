# Messaging Engagement / Response Analytics

You send a lot of messages. This tells you whether they actually **work**: what
share earn a reply, how fast customers respond, and how often a message leads to
an order.

## What it does

Walks each customer's chronological timeline and pairs every **outbound** message
(broadcast, follow-up, re-engagement, manual send) with the next **inbound**
reply, measuring:

- **reply rate** — % of outbound messages that earned a reply (within 48h)
- **reply latency** — median + average time-to-reply, plus a histogram
- **message → order** — % of outbound messages followed by an order (within 7d)

## How it differs from siblings

- **Send-time** = which hour/day customers are active (when to send).
- **Conversion funnel** (analytics) = customer-level Contacts → Ordered.
- **This** = per-**message** effectiveness: do sends earn replies, how fast, do they convert.

Reads `storeCRM` interaction timelines only. Rebuilds nothing.

## Run it

```bash
npm run engagement:check   # validate reply-pairing + latency buckets on a fixture
npm run engagement:batch   # build snapshot -> public/engagement/snapshot.json
```

Dashboard: **`/engagement.html`** — reply-rate/latency KPIs + latency histogram.

## Schedule on PC #2

```cron
27 3 * * *  cd /path/to/supersenderpro && node scripts/engagement-batch.js
```

Windows are configurable in the engine: `replyWindowHours` (default 48),
`orderWindowDays` (default 7).

## Live API (optional)

Wire into `server.js` next to the other `/api` mounts:

```js
// ENGAGEMENT HOOK
app.use('/api', require('./routes/engagementRoutes')());
```

| Method | Path | Returns |
|---|---|---|
| GET | `/api/engagement/snapshot` | Reply rate + latency + conversion for one store |
| GET | `/api/engagement/all` | All stores |

## Pairs with

Low reply rate + the send-time module = you're probably sending at the wrong
hour. High reply rate but low message→order = the message engages but doesn't
sell; that's an A/B-testing job.
