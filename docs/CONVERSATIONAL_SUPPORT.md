# Conversational AI Support (Feature #1)

A **24/7 WhatsApp support agent** that answers customer questions, takes orders, and escalates to
a human when needed. The AI runs on the **self-hosted llmHub (Ollama-first)** so it costs nothing
and stays on-prem. A deterministic FAQ/keyword layer keeps it working even when no model is
reachable, so the agent never goes silent.

**Safe by default:** `CONV_SUPPORT_DRY_RUN=true` means replies are *prepared but not sent*
(`delivered:false`). Flip to `false` only after a real WhatsApp send adapter is wired and tested.

## What it does

- **Answers questions** grounded in a tenant knowledge base (FAQs + product catalog + business settings).
- **Takes orders** via conversational slot-filling: product → quantity → address → confirm. On confirm
  it hands off to the existing `lib/ecommerceHub` order pipeline if present, otherwise stages the
  order on the conversation so nothing is lost.
- **Escalates to a human** on: an explicit ask ("agent", "human", "refund", "complaint", "baat karni"…),
  low model/keyword confidence, an answer it couldn't ground, or repeated low-quality turns. Escalated
  conversations go into a **handoff queue** your staff can claim/resolve, and the bot goes silent so a
  human owns the thread.

## Module layout (repo convention)

```
lib/conversationalSupport/
  config.js          env-driven config, DRY-RUN default ON, escalation thresholds + keywords
  util.js            ids, time, phone masking, {{var}} interpolation, overlap scoring
  store.js           tenant-scoped JSON + mtime read cache
  knowledgeBase.js   FAQs + products + settings CRUD; grounding context + FAQ matcher
  conversations.js   per-contact state (history, mode, order slots, escalation), TTL cleanup
  brain.js           llmHub routing (Ollama-first): classify() + answer(), deterministic fallbacks
  escalation.js      handoff decision rules + per-tenant handoff queue
  orderFlow.js       slot-filling order capture; soft ecommerceHub integration
  engine.js          handleMessage() orchestrator
  doctor.js          self-check
  index.js           public surface + example seeder
routes/conversationalSupportRoutes.js
scripts/wire-conversational-support.js
tests/smoke/conversationalSupportSmoke.js
```

## Env matrix

| Var | Default | Purpose |
| --- | --- | --- |
| `CONV_SUPPORT_ENABLED` | `true` | master switch |
| `CONV_SUPPORT_DRY_RUN` | `true` | prepare replies without sending |
| `CONV_SUPPORT_USE_AI` | `true` | route through llmHub (else fallback-only) |
| `CONV_SUPPORT_REQUIRE_ADMIN` | `true` | guard write endpoints |
| `CONV_SUPPORT_ADMIN_SECRET` | – | admin secret (falls back to `ADMIN_TOKEN`/`CHANNEL_ADMIN_SECRET`) |
| `CONV_SUPPORT_ESCALATE_BELOW` | `0.45` | escalate when confidence below this |
| `CONV_SUPPORT_ESCALATE_AFTER_FALLBACKS` | `3` | escalate after N low-quality turns |
| `CONV_SUPPORT_SESSION_TTL_HOURS` | `48` | auto-close stale conversations |
| `CONV_SUPPORT_MAX_HISTORY` | `12` | turns of context fed to the model |
| `CONV_SUPPORT_ESCALATE_KEYWORDS` | (sane defaults) | comma-separated, force handoff |
| `CONV_SUPPORT_ORDER_KEYWORDS` | (sane defaults) | comma-separated, hint order intent |

The agent uses whatever the project's `lib/llmHub` is configured for. Per the standing decision:
`LLM_DEFAULT_PROVIDER=ollama`, endpoint `http://127.0.0.1:11434`, model `qwen2.5:32b`,
`OLLAMA_KEEP_ALIVE=-1` to keep it warm.

## Endpoints (mounted at `/api/conversational-support`)

- `GET /status` · `GET /doctor`
- `GET/PUT /settings`
- `GET/POST /faqs`, `DELETE /faqs/:faqId`
- `GET/POST /products`, `DELETE /products/:prodId`, `POST /seed-example`
- `POST /simulate` — forced dry-run test harness (never sends)
- `POST /inbound` — real webhook; respects `CONV_SUPPORT_DRY_RUN`. Point your WhatsApp provider here.
- `GET /conversations`, `GET /conversations/:phone`, `POST /conversations/:phone/reset`, `POST /cleanup`
- `GET /handoffs`, `POST /handoffs/:id/claim`, `POST /handoffs/:id/resolve`

Write endpoints are admin-guarded; phone numbers are masked in all read output.

## Quick start

```bash
node scripts/wire-conversational-support.js      # mount the router in server.js (idempotent)
node tests/smoke/conversationalSupportSmoke.js   # prove it end-to-end (no model needed)
```

Then seed a KB and try it:

```bash
curl -X POST localhost:3000/api/conversational-support/seed-example
curl -X POST localhost:3000/api/conversational-support/simulate \
  -H 'content-type: application/json' \
  -d '{"phone":"+923001234567","text":"how long does delivery take?"}'
```

## Go live

1. Add your real FAQs + products (`POST /faqs`, `POST /products`) or `PUT /settings`.
2. Point your WhatsApp inbound webhook at `POST /inbound` (send `{phone, name, text}`).
3. Wire a real send adapter and set `CONV_SUPPORT_DRY_RUN=false` once tested.
4. Staff watch `GET /handoffs` (or the ops dashboard) and claim/resolve escalations.
