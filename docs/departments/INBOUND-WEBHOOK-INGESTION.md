# Feature #51 — Inbound Webhook Ingestion

Receive webhooks **from** other systems (Stripe, Shopify, Zapier, your own apps), verify they're
genuine, normalize the payload into a clean internal event, and fire it into the automation engine
(#48) / alerts (#28). The inbound counterpart to the outbound webhooks in the API gateway (#20).

## Why
The API gateway (#20) lets SuperSender push events out; nothing let it safely take events IN. Real
integrations are two-way: "when Stripe says a payment succeeded" or "when my Shopify order is
paid" should trigger SuperSender automations. This is the secure ingestion boundary that makes
that possible without exposing the automation engine to unverified traffic.

## What it does
- **Register endpoints:** `create({ source, scheme, signatureHeader, timestampHeader, mapping })`
  → a unique public path `/_in/<slug>` + a shared secret (returned once).
- **Verify signatures:** `hmac_sha256` (HMAC of the raw body, optional `<ts>.` prefix + `v1=`
  wrapping for Stripe-style), `token` (constant-time shared-header compare), or `unsigned`
  (accepted only when explicitly configured). Bad/missing signature → 401.
- **Map payloads:** a SAFE field-path mapping (`{ event, fields: { target: 'a.b.c' } }`, dotted
  paths + array indices + defaults, **no eval**) turns a provider's shape into a normalized
  `{ event, ...fields }` internal event. The event name can be a literal or read from the payload.
- **Dedupe:** redelivered events (same source + external id) within the window return 409 and
  don't re-fire.
- **Fan out:** the normalized event is emitted into automation #48 (and optionally alerts #28).
  Missing depts degrade to no-op.

## Files
- `lib/inboundWebhooks/config.js` — env posture (fan-out targets, dedupe window, log cap)
- `lib/inboundWebhooks/store.js` — atomic JSON store (`data/inbound-webhooks.json`)
- `lib/inboundWebhooks/verify.js` — HMAC-SHA256 / token / unsigned verification (timing-safe)
- `lib/inboundWebhooks/mapper.js` — safe field-path payload->event mapping (no eval)
- `lib/inboundWebhooks/endpointStore.js` — endpoint CRUD (secret shown once, masked after)
- `lib/inboundWebhooks/ingestEngine.js` — verify → parse → dedupe → map → log → fan out
- `lib/inboundWebhooks/doctor.js` — offline self-check + posture
- `lib/inboundWebhooks/index.js` — barrel
- `routes/inboundWebhooksRoutes.js` — admin REST (`/api/inbound-webhooks`) + a PUBLIC `receiver`
- `scripts/inbound-webhooks-check.js`, `tests/smoke/inboundWebhooksSmoke.js`

## Wiring (server.js — 3 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const inboundWebhooksRoutes = require('./routes/inboundWebhooksRoutes');
app.use('/api/inbound-webhooks', inboundWebhooksRoutes);                          // admin API
// PUBLIC receiver — MUST use a raw body parser so HMAC sees the exact bytes:
app.post('/_in/:slug', express.raw({ type: '*/*' }), inboundWebhooksRoutes.receiver);
```
Register an endpoint, point the provider at `https://your-domain/_in/<slug>`, and rules in #48
listening for the mapped event name fire automatically:
```js
const iw = require('./lib/inboundWebhooks');
const { url, secret } = iw.endpointStore.create({ source: 'stripe', scheme: 'hmac_sha256',
  signatureHeader: 'stripe-signature', timestampHeader: 'stripe-timestamp',
  mapping: { event: { path: 'type' }, fields: { contact: 'data.object.customer_phone', amount: 'data.object.amount_total' }, externalIdPath: 'id' } });
// -> point Stripe at <domain>+url, store `secret` in Stripe's webhook config
```

## Endpoints
- Admin (`/api/inbound-webhooks`): `GET /status`, `GET /doctor`, `GET /overview`,
  `POST /endpoints`, `GET /endpoints`, `POST /endpoints/:id/active`, `POST /endpoints/:id/mapping`,
  `GET /events`
- Public: `POST /_in/:slug` → verify + normalize + fan out (200/401/404/409/400)

## Safety
JSON-backed; **never sends**. Signatures verified by default (unsigned must be explicit), compared
timing-safe. **Raw request bodies are not stored** (only the normalized event + which keys it had).
Endpoint secrets shown once, masked after. Dedupe prevents double-firing. Fan-out is best-effort
+ non-fatal. 100% additive; no existing module/route/data changed, no new dependency (node crypto
+ express).

## Env
```
INBOUND_WEBHOOKS_ENABLED=true
INBOUND_WEBHOOKS_FAN_AUTOMATION=true          # fire normalized events into automation #48
INBOUND_WEBHOOKS_FAN_ALERTS=false             # also emit into alerts #28
INBOUND_WEBHOOKS_DEDUPE_WINDOW_MINUTES=1440
INBOUND_WEBHOOKS_MAX_EVENT_LOG=5000
```

## Verify
```bash
for f in lib/inboundWebhooks/*.js; do node --check "$f"; done
node --check routes/inboundWebhooksRoutes.js
npm run inbound-webhooks:check
npm run inbound-webhooks:smoke
```

Feature #51 done. Agle number ka intezaar.
