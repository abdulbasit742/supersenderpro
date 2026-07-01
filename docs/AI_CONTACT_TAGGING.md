# AI Smart Contact Tagging / Auto-Segmentation (#105)

Auto-labels every contact with **interest**, **intent**, and **lifecycle stage** tags
derived deterministically from their message history + RFM-lite signals. Optional
self-hosted Ollama enrichment adds nuanced persona/interest tags, with graceful
fallback when no model is running.

## Why
Feeds segmentation (#42), intent routing (#17), lead intel (#11), Customer 360 (#48)
and win-back (#36) with consistent, queryable tags. No external API, no new deps.

## Tag families
- `stage:<new|active|vip|dormant|at-risk|cold>` lifecycle
- `intent:<buy|support|delivery|payment|greeting>`
- `interest:<electronics|fashion|beauty|home>` (+ AI-enriched personas when enabled)
- `buyer`, `vip` flags

## Mount
```js
app.use('/api/contact-tagging', require('./routes/contactTaggingRoutes'));
```

## API
- `POST /api/contact-tagging/tag` `{ contactId, history:[{text,ts,amount,direction}], ai? }`
- `GET  /api/contact-tagging/contact/:id`
- `GET  /api/contact-tagging/segment/:tag`
- `GET  /api/contact-tagging/summary`

Tenant via `x-tenant-id` header, `req.tenantId`, or body `tenantId`.

## Storage
`data/contactTags/<tenantId>.json` (file-backed, tenant-isolated).

## AI enrichment
Set `ai:true` on the tag request. Routes through `ai/aiBrain.processPrompt`
(self-hosted Ollama `qwen2.5:32b`). If unavailable, deterministic tags are returned.

## Test (offline)
```bash
node tests/smoke/contactTaggingSmoke.js
```
