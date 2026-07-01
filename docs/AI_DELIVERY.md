# AI Delivery Tracking + Proactive Notifications

\"Where is my order?\" is the #1 support question, and silence after purchase kills trust. This tracks each shipment through a status lifecycle, **proactively messages the customer on every key transition** (so they never have to ask), detects **stuck shipments** past your SLA, and phrases friendly status/ETA updates via self-hosted Ollama. Zero cloud cost.

## Why

Proactive updates do two things at once: they cut the flood of \"where is it?\" messages that bury your inbox, and they build trust that brings customers back. Catching stuck shipments early (before the customer complains) turns a bad experience into a save.

## How it works

```
createShipment(orderId, phone)  ->  status: created
updateStatus(orderId, dispatched|in_transit|out_for_delivery|delivered|failed|returned)
   -> records history, queues a customer notification (for configured statuses)
   -> on delivered: triggers a review request (#38) + tells fraud-risk (#58) the COD outcome
   -> on returned: records the RTO in fraud-risk (#58)
stuckShipments(): any non-terminal shipment past its per-status SLA hours
```

- **Deterministic lifecycle + SLA**; the model only phrases the update message.
- **Proactive by default:** dispatched / out-for-delivery / delivered / failed / returned all notify (configurable).
- **Cross-feature hooks:** delivered → review request + COD delivered outcome; returned → RTO. All best-effort.
- **Zero new npm dependencies.**

## Files

- `lib/delivery/deliveryTracker.js` — create / update / stuck / notifications / track.
- `routes/deliveryRoutes.js` — self-mountable router.
- `scripts/delivery-watch.js` — periodic stuck + pending-notify sweep (cron-ready).
- `tests/smoke/deliverySmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/delivery', require('./routes/deliveryRoutes'));
```

## Watch cron (PC #1)

```bash
0 * * * *  cd /path/to/supersenderpro && node scripts/delivery-watch.js >> data/delivery/watch.log 2>&1
```

A worker sends pending notifications via the WhatsApp engine, then `POST /api/delivery/notified`. Stuck shipments surface for manual follow-up (and the daily owner briefing #29).

## Environment / config

```
DELIVERY_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

Tune via `PUT /api/delivery/config` (`slaHours` per status, `notifyOn` statuses, `requestReviewOnDelivered`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/delivery/create` | Start tracking. Body: `{ orderId, phone, courier?, trackingId?, etaISO? }` |
| POST | `/api/delivery/update` | Set status. Body: `{ orderId, status, note?, etaISO? }` |
| GET | `/api/delivery/track/:orderId` | Customer-facing \"where is my order\" answer |
| GET | `/api/delivery/shipment/:orderId` | Full shipment record |
| GET | `/api/delivery/stuck` | Shipments past SLA |
| GET | `/api/delivery/notifications` | Pending customer notifications |
| POST | `/api/delivery/notified` | Mark a notification sent. Body: `{ orderId }` |
| GET | `/api/delivery/list` | All shipments (filter by status) |
| GET/PUT | `/api/delivery/config` | Read / tune SLA + notify rules |
| GET | `/api/delivery/health` | Brain + cross-feature wiring |

### Example

```bash
curl -X POST localhost:3000/api/delivery/create -d '{"orderId":"O123","phone":"+92300xxxxxxx","courier":"TCS","trackingId":"TX999"}' -H 'Content-Type: application/json'
curl -X POST localhost:3000/api/delivery/update -d '{"orderId":"O123","status":"dispatched","etaISO":"2026-07-02"}' -H 'Content-Type: application/json'
# -> { notification:{ phone, message:"\ud83d\udce6 Good news! Your order has been dispatched (tracking TX999 / TCS). ETA Thu 2 Jul" } }
```

## Wiring into the flow

1. On order confirm (order extraction #25 / checkout), call `createShipment({ orderId, phone })`.
2. As your courier/ops update status (manually or via webhook), call `updateStatus`. The pending notification is sent by your queue worker.
3. Let the support agent (#1) answer \"where is my order?\" by calling `trackForCustomer({ orderId })`.
4. `delivered` auto-fires the review request (#38) and feeds fraud-risk (#58) the good COD outcome; `returned` records the RTO.

## Tests

```bash
node tests/smoke/deliverySmoke.js
```
