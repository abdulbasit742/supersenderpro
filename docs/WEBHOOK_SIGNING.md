# Outbound Webhook Signing + Retries

When we POST events to a tenant's webhook URL, the receiver needs to know it's really us and that the payload wasn't tampered with. This adds **HMAC-SHA256 signatures + retries**, the same scheme Stripe uses (so it's familiar to integrators).

## Sending
```js
const { deliver } = require('../lib/webhooks/signedDelivery');
const r = await deliver(endpoint.url, { event: 'order.paid', data }, { secret: endpoint.secret, retries: 3 });
// r = { ok, status, attempts, signature }
```
- Header sent: `X-Signature: t=<unix>,v1=<hmac_hex>` over `"${t}.${body}"`.
- Retries with exponential backoff on network errors / 5xx; **4xx is not retried** (client rejected it).
- `dryRun` (auto when no global fetch) computes the signature without sending - safe for tests/dev.

## Receiver verification (share this with integrators)
```js
const { verify } = require('../lib/webhooks/signedDelivery');
const ok = verify(rawRequestBody, req.headers['x-signature'], sharedSecret, 300); // 5-min tolerance
```
Reject if false. The 5-minute timestamp tolerance prevents replay of old captures.

## Relation to existing dispatcher
`lib/webhookDispatcher.js` already queues/sends; this is the signing+retry transport you can call from it (or directly). Per-tenant secrets live on the `webhook_endpoints` records (schema: `WebhookEndpoint.secret`).

## Verify
```bash
node tests/smoke/signedWebhookSmoke.js
```
