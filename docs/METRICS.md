# Metrics (/metrics, Prometheus-compatible)

Scrapeable metrics so Prometheus/Grafana (or any TSDB) can chart traffic, latency, and process health. Dependency-free, pairs with the observability subsystem.

## Endpoint
`GET /metrics` -> Prometheus text exposition (`text/plain; version=0.0.4`). Protect it in prod by setting `METRICS_TOKEN` (then scrape with `Authorization: Bearer <token>`).

## What's exported
- `http_requests_total{method,route,status}` - request counter (auto, via `httpMetrics()` middleware).
- `http_request_duration_seconds{method,route}` - latency histogram (buckets + `_sum` + `_count`).
- `process_resident_memory_bytes`, `process_uptime_seconds` - sampled at scrape time.
- Add your own: `metrics.inc('messages_sent_total', { channel })`, `metrics.observe(...)`, `metrics.setGauge(...)`.

## High-cardinality guard
Route labels normalize ids (`/deals/abc123` -> `/deals/:id`) so the label space doesn't explode.

## Wire
Registered in `registerSubsystems` (the `httpMetrics()` middleware runs early, `/metrics` route mounted). No extra step.

## Verify
```bash
node tests/smoke/metricsSmoke.js
# after boot: curl localhost:PORT/metrics
```

## Custom business metrics (examples)
```js
const m = require('../lib/observability/metrics');
m.inc('messages_sent_total', { channel: 'whatsapp' });
m.inc('deals_won_total');
m.observe('broadcast_batch_seconds', durationSec);
```
