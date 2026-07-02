# AI Instant FAQ Deflection / Auto-Answer

Intercepts inbound WhatsApp messages and **instantly auto-answers** the most
common repetitive questions (COD? delivery charges? working hours?) BEFORE the
heavier support agent or LLM ever runs. This deflects a large share of traffic
deterministically (no model required) and only escalates the messages that
actually need the full agent or a human.

## Why

Most WhatsApp commerce inboxes are flooded with the same 10-20 questions. Paying
(in latency or tokens) to run the full AI agent on every "COD hai?" is wasteful.
This engine answers those in milliseconds, deterministically, and keeps your
self-hosted GPU free for the conversations that matter.

## How it works

1. **Normalize** the incoming message (lowercase, strip punctuation, collapse whitespace).
2. **Score** every stored FAQ using a deterministic blend of:
   - token overlap (Jaccard) between message and FAQ question+keywords,
   - direct keyword hits,
   - alias / exact-phrase match (strongest signal).
3. If the top score clears the **confidence threshold** (default `0.55`), the
   canned answer is returned and the message is **deflected**.
4. Otherwise the message is **escalated** to the full support agent / human.
5. Optionally, if a local Ollama is reachable, the canned answer is lightly
   **rephrased** to match the customer's tone/language. Facts are preserved.
   If the model is offline, the canned answer is returned verbatim. Never blocks.

Everything is **tenant-scoped** and **file-backed** under `data/faqDeflection/`.

## Mounting

```js
app.use('/api/faq-deflection', require('./routes/faqDeflectionRoutes'));
```

Or let the AI Suite control panel mount it automatically via `aiSuite.mountAll(app)`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/api/faq-deflection/health` | engine + storage + model status |
| GET  | `/api/faq-deflection/faqs` | list FAQs for the tenant |
| POST | `/api/faq-deflection/faqs` | upsert one FAQ |
| POST | `/api/faq-deflection/faqs/bulk` | bulk seed `{ faqs: [...] }` |
| DELETE | `/api/faq-deflection/faqs/:id` | remove a FAQ |
| POST | `/api/faq-deflection/match` | dry-run match (no stats, no side effects) |
| POST | `/api/faq-deflection/deflect` | main: answer or escalate (records stats) |
| GET  | `/api/faq-deflection/stats` | seen / deflected / escalated / deflectionRate |

Tenant is resolved from `x-tenant-id` header, `?tenantId=`, or `body.tenantId`.

### FAQ shape

```json
{
  "question": "Do you offer cash on delivery?",
  "answer": "Yes! We offer Cash on Delivery across Pakistan.",
  "keywords": ["cod", "cash on delivery"],
  "aliases": ["cod available", "do you have cod"],
  "category": "payments"
}
```

### Deflect request / response

```http
POST /api/faq-deflection/deflect
{ "message": "bhai COD available hai?", "options": { "threshold": 0.55 } }
```

```json
{
  "ok": true,
  "deflected": true,
  "answer": "Yes! We offer Cash on Delivery across Pakistan...",
  "faqId": "faq_...",
  "category": "payments",
  "score": 0.92,
  "confidence": "high",
  "escalate": false,
  "phrased": false,
  "candidates": [ { "id": "faq_...", "question": "...", "score": 0.92 } ]
}
```

When no FAQ clears the threshold:

```json
{ "ok": true, "deflected": false, "answer": null, "escalate": true, "score": 0.21 }
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `threshold` | `0.55` | minimum score to deflect instead of escalate |
| `phrase` | `true` | allow optional Ollama rephrasing of the canned answer |
| `timeoutMs` | `4000` | max wait for the optional model call |

## Guarantees

- **Zero new npm dependencies** (Node built-ins + `express` + global `fetch`).
- **Deterministic core**: matching never needs a model; AI is polish only.
- **Graceful degradation**: model offline -> canned answer, never throws.
- **Tenant isolation**: missing `tenantId` throws; stores are per-tenant.
- **`server.js` untouched**: self-mountable router.
- **Offline smoke test**: `node tests/smoke/faqDeflectionSmoke.js`.

## Test

```bash
node tests/smoke/faqDeflectionSmoke.js
```

Runs fully offline (forces the AI host to an unreachable address) and asserts
matching, deflection, escalation, stats, tenant isolation, and health.
