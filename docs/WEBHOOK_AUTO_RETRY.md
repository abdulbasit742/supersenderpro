# Webhook Auto-Retry

Closes the outbound-webhook loop: the delivery log (#336) records failures and supports **manual** replay; this adds **automatic** capped retries so a receiver that was briefly down recovers on its own.

## How it works
A scheduled job (`webhook-retry`, every `WEBHOOK_RETRY_MS`, default 10m) scans the delivery log per tenant for `status:'failed'` rows that are:
- under `WEBHOOK_RETRY_MAX` attempts (default 5), and
- within the `WEBHOOK_RETRY_AGE_MS` window (default 24h - don't retry ancient failures forever).

It replays each via the delivery log (#336), which goes through signed delivery (#298) wrapped in the **circuit breaker** (#325) - so a still-dead host isn't hammered. After `WEBHOOK_RETRY_MAX` attempts a delivery is marked `exhausted` and left alone.

## States
`failed` -> (retry) -> `delivered` on success, or `failed` again with `retryCount++`, until `exhausted`.

## Env
```
WEBHOOK_RETRY_MS=600000      # how often the job runs
WEBHOOK_RETRY_MAX=5          # attempts before giving up
WEBHOOK_RETRY_AGE_MS=86400000 # only retry failures newer than this
WEBHOOK_RETRY_BATCH=50       # max deliveries per tenant per run
SALES_TICK_TENANTS=default   # tenants the job iterates
```

## The complete webhook system now
endpoints (#343) + signing (#298) + delivery log/replay (#336) + circuit breaker (#325) + **auto-retry (this)** + event-bus fan-out (#344/#345).

## Verify
```bash
node tests/smoke/webhookRetrySmoke.js
```
