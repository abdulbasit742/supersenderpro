# API #3: Rate Limiter

Protects the public API (`/api/v1`, api #1) from buggy loops or abuse. Sliding-window, keyed per API
key (falls back to IP), returns `429` with standard headers.

## What shipped
- `lib/api/rateLimiter.js` — `rateLimit({ windowMs, max, keyFn, name })` Express middleware.

## Wiring (server.js)

Apply AFTER the API-key auth (so it keys per key), before the handlers:

```js
const { rateLimit } = require('./lib/api/rateLimiter');
const { requireApiKey } = require('./lib/api/apiKeys');

// e.g. 120 requests/min per key on the public API
app.use('/api/v1', requireApiKey(), rateLimit({ windowMs: 60000, max: 120, name: 'v1' }));

// stricter limit on the send endpoint specifically
app.post('/api/v1/messages', rateLimit({ windowMs: 60000, max: 30, name: 'v1-send' }), sendHandler);
```

## Headers returned
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Window`
- On 429: `Retry-After` (seconds)

## Multi-instance
In-memory per process today. For multiple instances, back the window store with Redis (same
middleware signature). Pair with the per-plan `apiCallsPerMonth` enforcement (usage meter, billing
#6) for hard monthly quotas on top of this per-minute burst limit.
