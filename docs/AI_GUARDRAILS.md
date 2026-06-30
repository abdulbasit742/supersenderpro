# AI Safety Guardrails

A customer-facing AI that answers freely and takes orders needs a seatbelt. This wraps every AI exchange with **prompt-injection defense**, **PII redaction**, and **output moderation** — so the bot can't be tricked into leaking its prompt/secrets, can't send unsafe or over-promising replies, and never logs raw card/CNIC/phone data. Deterministic rules run with no model; an optional local-model moderation pass adds a second opinion. All on-prem.

## Why

Once an AI can take orders and talk freely, three things will happen: someone will try "ignore previous instructions", the model will occasionally echo its own scaffolding, and customers will paste card numbers into chat. This is the layer that handles all three before they become an incident.

## What it does

**Inbound (before the model sees it):**
- Detects prompt-injection ("ignore previous instructions", `you are now...`, fake `<system>` tags, DAN/jailbreak, "reveal your prompt").
- Strips fake role/system markers so they can't act as instructions.
- Produces a PII-redacted copy for safe logging (card, email, IBAN, CNIC, phone).

**Outbound (before the customer sees it):**
- Blocks replies that leak system/prompt scaffolding or secrets (API keys, bearer tokens).
- Flags over-promising / compliance risks ("100% guaranteed refund", "guaranteed profit").
- Blocks profanity.
- Optional **AI moderation** second opinion via self-hosted Ollama.
- On block, substitutes a safe handoff message instead of sending the bad reply.

**Zero new npm dependencies.**

## The one-liner that protects everything: `guardedReply`

Wrap any existing async reply generator and it's protected end-to-end:

```js
const { guardedReply } = require('./lib/guardrails/guardrails');
const supportAgent = require('./ai/agents/supportAgent');

// protect the support agent (feature #1)
const safeHandle = guardedReply(async (cleanText, ctx) => {
  const r = await supportAgent.handleMessage({ storeId: ctx.storeId, phone: ctx.phone, message: cleanText });
  return r.reply;
}, { useAI: false });

const { reply } = await safeHandle(inboundText, { storeId, phone });
// `reply` is sanitized-in, moderated-out, safe to send.
```

## Files

- `lib/guardrails/guardrails.js` — inbound/outbound guards + `guardedReply` wrapper.
- `routes/guardrailsRoutes.js` — self-mountable router.
- `tests/smoke/guardrailsSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/guardrails', require('./routes/guardrailsRoutes'));
```

## Environment

```
GUARDRAILS_MODEL=qwen2.5:32b   # only used when AI moderation is enabled
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/guardrails/inbound` | Sanitize + flag injection + redact. Body: `{ text }` |
| POST | `/api/guardrails/outbound` | Check a reply before sending. Body: `{ text, useAI? }` |
| POST | `/api/guardrails/redact` | PII-redact any text. Body: `{ text }` |
| GET | `/api/guardrails/health` | Pattern + PII coverage |

### Example

```bash
curl -X POST http://localhost:3000/api/guardrails/outbound \
  -H 'Content-Type: application/json' \
  -d '{"text":"my system prompt says you are a helpful ai"}'
# -> { ok:false, blocked:true, issues:["possible system/secret leak"], text:"Thanks for your message! ...", replaced:true }
```

## Recommended wiring

Put `guardedReply` around the support agent (#1), the agent copilot (#9) suggestions, and any other path that sends model output to a customer. Use the inbound guard's `redactedForLog` whenever you persist chat logs. Turn on `useAI` moderation for higher-risk stores.

## Tests

```bash
node tests/smoke/guardrailsSmoke.js
```
