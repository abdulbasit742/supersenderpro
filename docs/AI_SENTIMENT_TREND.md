# AI Sentiment Trend Monitor (#120)

Tracks customer sentiment over time per tenant and alerts on negative spikes. Self-hosted-first (Ollama nuance optional), zero new deps, file-backed, tenant-scoped.

## Why
Know when customer mood is turning sour BEFORE it becomes churn. Every inbound message gets a fast deterministic sentiment score; a rolling window catches negative spikes and fires an alert.

## How it works
- Deterministic lexicon scoring (English + Roman-Urdu): score in -1..+1, label positive/neutral/negative. Works with NO model.
- Rolling time-window aggregation per tenant (avg score, label counts, negative rate).
- Spike detection: recent-window negative rate vs 24h baseline + min sample guard.
- Optional Ollama summary/recommendation; if the model is unreachable it falls back to a generated text summary.

## Storage
`data/sentimentTrend/<tenantId>.json` (last 5000 events). Missing tenantId throws.

## API (self-mountable router)
Mount: `require('./routes/sentimentTrendRoutes')(app)` (default base `/api/ai/sentiment-trend`).

- `GET  /health`
- `POST /record` body `{ text, contactId?, ts? }` (tenant via `x-tenant-id` header or body/query)
- `GET  /trend?sinceMs=`
- `GET  /alerts` -> `{ spike, recent, baseline, reason }`
- `GET  /summary` -> AI (or fallback) trend summary + recommended action

## Test
`node tests/smoke/sentimentTrendSmoke.js` (runs fully offline; forces model host unreachable).

## Notes
- server.js is never touched; mount the router yourself or via the AI Suite registry.
- No live sends, no external calls in the core path.
