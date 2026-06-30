# Conversational AI / Support Agent (Roadmap Feature #1)

A 24/7 WhatsApp agent that **answers FAQs**, **takes orders**, and **escalates to a human** when the customer asks or when it is not confident. AI runs on the project's **self-hosted llmHub (Ollama-first)** so inference cost is zero and customer data stays on-prem. If the hub is down, everything still works with deterministic replies.

> **Safe by default:** `CONV_SUPPORT_DRY_RUN=true` => the agent *prepares* a reply and **never sends**. Your webhook/delivery layer decides whether to send. Tenant-scoped throughout.

## What it does

| Capability | How |
| --- | --- |
| FAQ answers | Per-tenant knowledge base + a tiny dependency-free IDF retriever grounds the answer; the LLM only *phrases* it. Falls back to the raw KB answer if no hub. |
| Order taking | Small state machine: `item -> qty -> more? -> address -> confirm`. Persists the order and best-effort hands a confirmed order to `lib/ecommerceHub` orderPipeline. Always `dryRun:true`. |
| Human escalation | Triggered by human keywords (agent/insaan/complaint...) OR after `CONV_SUPPORT_MAX_UNKNOWN` low-confidence turns. Opens a handoff ticket + pings `lib/adminAlert`. |
| Conversation memory | Rolling per-contact history (for LLM context) + live order draft, TTL-expired. |

## Architecture

```
lib/conversationalSupport/
  config.js         env config + tenant-scoped data paths
  store.js          JSON persistence w/ mtime read cache (repo convention)
  llm.js            llmHub resolver (Ollama-first) + classify(); graceful null fallback
  knowledgeBase.js  FAQ CRUD + IDF keyword retriever (search => 0..1 confidence)
  sessions.js       per-contact conversation memory (history + order draft, TTL)
  intent.js         hybrid intent detection (rules first, optional LLM)
  orderTaking.js    conversational order state machine + persist + pipeline ingest
  escalation.js     human handoff tickets + admin alert (optional dep)
  agent.js          THE BRAIN: handle(tenant, contact, text) orchestrates everything
  doctor.js         self-check
  index.js          public surface + seedExample()
routes/conversationalSupportRoutes.js   admin-guarded API, masked phones
scripts/wire-conversational-support.js  idempotent server.js hook
scripts/conversational-support-check.js doctor runner (exit non-zero on blockers)
tests/smoke/conversationalSupportSmoke.js  offline, deterministic, tenant-isolation assert
```

## API (mounted at `/api/conversational-support`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/status` | dry-run flag, AI availability, KB size, open handoffs |
| GET | `/doctor` | self-check |
| GET/POST/DELETE | `/kb`, `/kb/bulk`, `/kb/:id` | knowledge base CRUD (writes admin-guarded) |
| GET | `/kb/search?q=` | inspect retriever scoring |
| POST | `/seed-example` | seed a starter FAQ set |
| POST | `/simulate` | **forced dry-run** test harness (open) |
| POST | `/inbound` | real webhook entry; respects `CONV_SUPPORT_DRY_RUN` (admin-guarded) |
| GET/POST | `/sessions...`, `/handoffs...`, `/orders` | inspect + manage |

`/simulate` body: `{ "phone": "+92300...", "name": "Ali", "text": "delivery kab hogi?" }`

## Wire it

The router is already mounted via `lib/bootstrap/registerSubsystems` (single bootstrap). To also add a standalone hook in `server.js`:

```bash
node scripts/wire-conversational-support.js
```

Then point your WhatsApp inbound webhook at `POST /api/conversational-support/inbound`.

## Env

| Var | Default | Meaning |
| --- | --- | --- |
| `CONV_SUPPORT_ENABLED` | `true` | master switch |
| `CONV_SUPPORT_DRY_RUN` | `true` | prepare replies, never send |
| `CONV_SUPPORT_USE_AI` | `true` | route phrasing/classification through llmHub |
| `CONV_SUPPORT_REQUIRE_ADMIN` | `true` | guard write endpoints |
| `CONV_SUPPORT_MIN_CONFIDENCE` | `0.18` | FAQ confidence floor |
| `CONV_SUPPORT_MAX_UNKNOWN` | `2` | low-confidence turns before auto-escalation |
| `CONV_SUPPORT_SESSION_TTL_HOURS` | `12` | session expiry |
| `CONV_SUPPORT_BOT_NAME` | `SuperSender Assistant` | agent display name |
| `CONV_SUPPORT_HUMAN_KEYWORDS` | agent,human,insaan,... | always-escalate keywords |

## Test

```bash
node tests/smoke/conversationalSupportSmoke.js   # offline, deterministic
node scripts/conversational-support-check.js      # doctor
```

The smoke test is picked up automatically by `scripts/ci-smoke.js` on every PR.
