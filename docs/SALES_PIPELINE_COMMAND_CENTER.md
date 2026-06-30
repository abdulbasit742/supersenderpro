# Sales & Pipeline (Deal-Closing) Command Center

> Lead -> Qualified -> Negotiation -> Proposal -> Won/Lost. Auto follow-ups, cart abandonment recovery, quote/invoice generation. **Yahan paisa banta hai.**

Self-contained revenue module. Tenant-scoped JSON store, AI/template copy, safe-by-default (dry-run, no live charges).

## Layout
```
lib/salesPipeline/
  config.js        stages + env config (dry-run default ON)
  store.js         tenant JSON store with mtime read-cache + counters
  util.js          ids, time helpers, phone masking
  aiCopy.js        LLM-hub-backed copy w/ Urdu/English template fallback
  pipeline.js      deal lifecycle, stage transitions, metrics
  followUps.js     stage-cadence follow-up scheduler + processor
  cartRecovery.js  abandoned-cart tracking + recovery nudges
  quotes.js        quote + invoice generation (text/HTML render)
  doctor.js        self-check
  index.js         namespace + tick() runner
routes/salesPipelineRoutes.js   REST API
scripts/wire-sales-pipeline.js  idempotent server.js mount
scripts/sales-pipeline-check.js presence/health check
tests/smoke/salesPipelineSmoke.js  dependency-free smoke test
```

## Wire it up
```bash
node scripts/wire-sales-pipeline.js   # mounts /api/sales-pipeline in server.js (idempotent)
node tests/smoke/salesPipelineSmoke.js
node scripts/sales-pipeline-check.js
```

## API (mounted at /api/sales-pipeline)
Reads are open (phones masked). Writes need x-admin-secret when one is configured.

| Method | Path | Purpose |
|---|---|---|
| GET | /status | metrics + dry-run flag |
| GET | /stages | stage definitions |
| GET | /metrics | pipeline value, win rate, by-stage |
| GET | /deals | list/filter deals (?stage=, ?open=true, ?q=) |
| POST | /deals | create lead/deal |
| GET/PUT | /deals/:id | get / update |
| POST | /deals/:id/stage | move stage ({stage, reason?}) |
| POST | /deals/:id/activity | mark customer reply (resets follow-ups) |
| POST | /deals/:id/notes | add note |
| GET | /followups/due | due follow-ups |
| POST | /followups/process | prepare/send due follow-ups |
| GET/POST | /carts | list / track abandoned cart |
| POST | /carts/:id/status | recovered / purchased / abandoned |
| POST | /carts/process | run recovery nudges |
| GET/POST | /quotes | list / create quote |
| GET/POST | /invoices | list / create invoice ({quoteId} or {items}) |
| GET | /docs/:id?format=html\|text | render quote/invoice |
| POST | /tick | run all due automations (cron-friendly) |

## Env (see .env.sales-pipeline.example)
SALES_PIPELINE_ENABLED, SALES_PIPELINE_DRY_RUN (default true), SALES_PIPELINE_REQUIRE_ADMIN,
SALES_PIPELINE_ADMIN_SECRET, SALES_PIPELINE_CURRENCY, SALES_PIPELINE_TAX_PERCENT,
SALES_PIPELINE_INVOICE_PREFIX, SALES_PIPELINE_QUOTE_PREFIX, SALES_PIPELINE_INVOICE_DUE_DAYS,
SALES_PIPELINE_FOLLOWUP_HOURS (e.g. 24,72,168), SALES_PIPELINE_CART_STEPS_MIN (e.g. 60,1440,4320).

## Going live (later)
- Set SALES_PIPELINE_DRY_RUN=false and provide a global.sendWhatsApp(phone, text, meta) sender to actually send follow-ups/recovery.
- Schedule POST /api/sales-pipeline/tick (or SP.tick(tenantId)) every few minutes.
- For real payment capture, integrate the existing lib/saasBilling Stripe path - this module stays document-only.
