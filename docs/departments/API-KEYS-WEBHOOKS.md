# Feature #20 — Public API Keys + Outbound Webhooks

Let other systems integrate with SuperSender: **scoped API keys** to call your API, and
**outbound webhooks** so SuperSender can push events (payment succeeded, message received,
ticket created…) to a customer's endpoint, signed so they can trust it.

## Why
A real SaaS needs a programmatic surface + events. The repo had an internal webhook dispatcher
but no public, scoped API-key auth and no signed, retrying outbound subscription system. This
adds both as a self-contained dept.

## What it does
### API keys
- **Issue scoped keys:** `issue({ name, scopes, rateLimitPerMin })` → returns the plaintext
  secret **once**; only a SHA-256 hash + a masked label are stored (a leaked store file can't
  authenticate).
- **Scopes:** `contacts:read/write`, `messages:send`, `campaigns:read/write`, `analytics:read`,
  `webhooks:manage`, or `*`.
- **Auth middleware:** `requireApiKey(scope)` reads `Authorization: Bearer <key>` or `x-api-key`,
  enforces the scope, and applies a **per-key rate limit** (sets `X-RateLimit-*` headers; 429
  when exceeded). 401 bad key, 403 missing scope.
- **Revoke + rotate** (rotate revokes the old + issues a fresh secret).

### Outbound webhooks
- **Subscriptions:** `{ url, events:[...], secret }`. Signing secret returned once.
- **Signed delivery:** each POST body is HMAC-SHA256 signed with the subscription secret +
  timestamp, sent as `X-SuperSender-Signature` / `X-SuperSender-Timestamp`, so receivers verify
  authenticity (replay-safe with the timestamp).
- **emit(event, payload):** enqueues a delivery for every matching active subscription.
- **Retries:** `tick()` processes due deliveries; failed live deliveries retry with exponential
  backoff up to `maxWebhookRetries`, then **dead-letter**.
- **Dry-run by default:** deliveries are recorded + signed but not sent over the network until
  live delivery + an HTTP sender are wired.

## Files
- `lib/apiGateway/config.js` — env posture (dry-run webhooks, rate limit, retries, scopes)
- `lib/apiGateway/store.js` — atomic JSON store (`data/api-gateway.json`)
- `lib/apiGateway/keyStore.js` — issue/verify/revoke/rotate (hash-at-rest, shown once)
- `lib/apiGateway/rateLimiter.js` — per-key fixed-window limiter
- `lib/apiGateway/authMiddleware.js` — `requireApiKey(scope)` Express middleware
- `lib/apiGateway/webhookSubscriptions.js` — subscription CRUD (+ KNOWN_EVENTS)
- `lib/apiGateway/webhookDispatcher.js` — emit + HMAC sign + retry/backoff + dead-letter
- `lib/apiGateway/doctor.js` — offline self-check + posture
- `lib/apiGateway/index.js` — barrel
- `routes/apiGatewayRoutes.js` — admin REST surface (`/api/api-gateway`)
- `scripts/api-gateway-check.js`, `tests/smoke/apiGatewaySmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const apiGatewayRoutes = require('./routes/apiGatewayRoutes');
app.use('/api/api-gateway', apiGatewayRoutes); // admin: behind your existing session/admin auth
```
Protect a PUBLIC API route with a scoped key:
```js
const { requireApiKey } = require('./lib/apiGateway').authMiddleware;
app.get('/api/v1/contacts', requireApiKey('contacts:read'), (req, res) => { /* req.apiKey is set */ });
```
Emit events where they happen + deliver on a schedule (node-cron already a dep):
```js
require('./lib/apiGateway').webhookDispatcher.emit('payment.succeeded', { invoiceId });
require('./lib/apiGateway').webhookDispatcher.setSender(async (url, body, headers) => {
  const r = await fetch(url, { method: 'POST', headers, body }); return { status: r.status };
});
require('node-cron').schedule('* * * * *', () => require('./lib/apiGateway').webhookDispatcher.tick());
```

## Endpoints (`/api/api-gateway`)
- `GET /status`, `GET /doctor`, `GET /scopes`
- `POST /keys` `{ name, scopes, rateLimitPerMin }` (secret shown once), `GET /keys`, `GET /keys/:id`
- `POST /keys/:id/revoke`, `POST /keys/:id/rotate`
- `POST /webhooks` `{ url, events, secret? }` (signing secret shown once), `GET /webhooks`
- `POST /webhooks/:id/active`, `DELETE /webhooks/:id`
- `POST /emit` `{ event, payload }`, `POST /deliveries/tick`, `GET /deliveries`

## Safety
JSON-backed; API key secrets **never** stored in plaintext (SHA-256 hash + masked label). Webhook
payloads HMAC-signed; delivery **dry-run** until `API_GATEWAY_LIVE_WEBHOOKS=true` + an HTTP sender.
Retries + dead-lettering bound failure. 100% additive; no existing module/route/data changed, no
new dependency (uses node's crypto + express).

## Env
```
API_GATEWAY_ENABLED=true
API_GATEWAY_LIVE_WEBHOOKS=false             # true + sender => deliveries actually POST
API_GATEWAY_DEFAULT_RATE_LIMIT=120
API_GATEWAY_MAX_WEBHOOK_RETRIES=5
API_GATEWAY_RETRY_BASE_SECONDS=30
API_GATEWAY_KEY_PREFIX=ssk
```

## Verify
```bash
for f in lib/apiGateway/*.js; do node --check "$f"; done
node --check routes/apiGatewayRoutes.js
npm run api-gateway:check
npm run api-gateway:smoke
```

Feature #20 done. Agle number ka intezaar.
