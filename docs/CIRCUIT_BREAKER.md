# Circuit Breaker (outbound dependencies)

Protects against hammering a failing downstream (a tenant's webhook URL, an SMTP host, a payment/integration API). After repeated failures the circuit opens and calls fail fast, sparing both sides, then self-heals.

## States
- **closed** - normal; calls go through. Failures counted.
- **open** - after `CB_FAILURE_THRESHOLD` consecutive failures; calls fail fast with `CIRCUIT_OPEN` for `CB_COOLDOWN_MS`.
- **half-open** - after cool-down, one trial call is allowed; success -> closed, failure -> open again.

## Use
```js
const cb = require('../lib/stability/circuitBreaker');
// one breaker per downstream key (e.g. webhook host)
const res = await cb.wrap('webhook:' + host, () => signed.deliver(url, payload, opts));
```
When open, `wrap` throws an error with `code === 'CIRCUIT_OPEN'` immediately - catch it to skip/retry-later instead of waiting on a dead endpoint.

## Pairs with
- Signed webhook delivery (#298) - wrap per destination host.
- Notification dispatcher (#322) - wrap email/webhook providers.

## Observability
`cb.snapshot()` returns `{ key: { state, failures } }` - expose via `/metrics` (`metrics.setGauge('circuit_open', 1, { key })`) or the ops dashboard.

## Env
```
CB_FAILURE_THRESHOLD=5
CB_COOLDOWN_MS=30000
CB_HALFOPEN_TRIALS=1
```

## Verify
```bash
node tests/smoke/circuitBreakerSmoke.js
```
