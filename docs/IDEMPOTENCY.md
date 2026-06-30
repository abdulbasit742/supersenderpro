# Idempotency Keys

Stops a retried POST from creating duplicate side-effects (double order, double charge, double broadcast) - essential once money and sends are involved.

## How it works
Client sends an `Idempotency-Key` header (any unique string per logical operation). The middleware:
1. **New key** -> runs the handler, captures the 2xx JSON response, stores it (per tenant+key, TTL 24h).
2. **Repeat key (completed)** -> replays the stored response with header `Idempotent-Replay: true` (handler does NOT run again).
3. **Repeat key (still in flight)** -> `409 duplicate request in progress`.

Backed by `lib/redis` cache, so it works across instances (and falls back to in-memory for single-instance dev). Keys are namespaced per tenant - two tenants reusing the same client key never collide.

## Use
```js
const { idempotent } = require('../lib/idempotency/middleware');
router.post('/orders', idempotent(), createOrderHandler);
router.post('/billing/checkout', idempotent(), checkoutHandler);
```
Opt-in per route; requests without the header pass straight through.

## Env
```
IDEMPOTENCY_TTL_SEC=86400   # how long a key + its stored response is remembered
```

## Verify
```bash
node tests/smoke/idempotencySmoke.js
```
