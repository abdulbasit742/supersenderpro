# Webhook Delivery Log + Replay

Signed delivery (#298) sends outbound webhooks but kept no record. This adds a per-tenant **delivery log** so you can see what was sent, debug failures, and **replay** a delivery.

## Send + log
```js
const log = require('../lib/webhooks/deliveryLog');
await log.deliverAndLog(tenantId, endpoint.url, { event: 'order.paid', data }, { secret: endpoint.secret });
```
Wraps `signedDelivery.deliver` (#298) in the **circuit breaker** (#325) keyed per destination host - a dead endpoint won't be hammered. Records status (`delivered`/`prepared`/`failed`), HTTP status, attempts, and payload.

## Inspect + replay (admin)
- `GET /api/webhooks/deliveries?status=failed&host=...&limit=` - recent attempts (tenant-scoped).
- `POST /api/webhooks/deliveries/:id/replay` - re-send a past delivery; logs a fresh attempt.

## Why
- Debugging: "did the webhook fire? what did the receiver return?"
- Recovery: replay failed deliveries after the receiver is fixed.
- Ties together signed delivery (#298) + circuit breaker (#325) + audit-style visibility.

## Verify
```bash
node tests/smoke/webhookLogSmoke.js
```
