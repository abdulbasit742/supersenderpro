# Webhook Endpoints (management + fan-out)

The missing piece of the webhook story: tenants register **where** events go. Combined with signing (#298) and the delivery log/replay (#336), this is a complete outbound-webhook system.

## Manage (auth + admin)
- `POST /api/webhooks/endpoints` `{ url, events? }` -> creates an endpoint with an auto-generated signing **secret (returned once)**. `events` defaults to `['*']` (all).
- `GET /api/webhooks/endpoints` -> list (secret masked, shows `hasSecret`).
- `PUT /api/webhooks/endpoints/:id` `{ url?, events?, active? }`.
- `POST /api/webhooks/endpoints/:id/rotate-secret` -> new secret (returned once).
- `DELETE /api/webhooks/endpoints/:id`.
- `POST /api/webhooks/endpoints/test` `{ event?, data? }` -> fan a test event to subscribers.

## Fan out an event (from code)
```js
const ep = require('../lib/webhooks/endpoints');
await ep.fanout(tenantId, 'order.paid', { orderId, amount });
```
Delivers to every **active** endpoint subscribed to the event (`['*']` or exact match), each via signed delivery (#298) + circuit breaker (#325), and records every attempt in the delivery log (#336).

## The full webhook system
- **endpoints (this)**: where + which events + secret.
- **signing (#298)**: HMAC so receivers trust us.
- **delivery log + replay (#336)**: what happened + re-send.
- **circuit breaker (#325)**: stop hammering a dead endpoint.

## Verify
```bash
node tests/smoke/webhookEndpointsSmoke.js
```
