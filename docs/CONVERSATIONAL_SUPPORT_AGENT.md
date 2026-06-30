# Conversational Support Agent (24/7, self-hosted AI)

A WhatsApp-facing AI support agent that **answers questions, takes orders, and escalates to a human** when needed. It runs on your **self-hosted Ollama** GPU box by default, so inference cost is zero and customer data stays on-prem.

## What it does

- **Answers FAQs** from a per-store knowledge base.
- **Takes orders**: detects buying intent and returns a structured `order` object (`{ product, qty }`).
- **Escalates to a human** when the customer asks for one, is upset (negative sentiment), raises a refund/complaint, or when the AI is not confident / unavailable.
- **Remembers context** per contact (rolling last 12 turns), persisted to `data/support_agent/`.
- **Replies in the customer's language** (English / Urdu / Hindi / Roman Urdu).

## Architecture

All generation goes through the existing **AI Brain Bridge** (`ai/aiBrain.js` → `processPrompt`), which routes to the configured provider. With `ai_provider=ollama` it uses your local model. Deterministic guardrails wrap the model:

```
inbound msg → language/intent/sentiment heuristics → build prompt (KB + catalog + history)
           → aiBrain.processPrompt (Ollama) → parse [ORDER]/[ESCALATE] tags
           → structured result { reply, intent, order, shouldEscalate, ... }
```

If the model or provider is down, the agent returns a safe canned reply **and** flags for human handoff, so a customer is never left hanging.

## Files

- `ai/agents/supportAgent.js` — the agent (core logic, KB, memory, guardrails).
- `routes/supportAgentRoutes.js` — self-mountable Express router.
- `tests/smoke/supportAgentSmoke.js` — offline smoke test (no model needed).

## Wiring it up (one line in server.js)

Next to the other route mounts in `server.js`, add:

```js
app.use('/api/support-agent', require('./routes/supportAgentRoutes'));
```

That's the only change to the monolith. The router pulls in everything else itself.

## Environment

Use the local GPU box for inference:

```
AI_PROVIDER=ollama
OLLAMA_HOST=http://127.0.0.1:11434
SUPPORT_AGENT_MODEL=qwen2.5:32b
OLLAMA_KEEP_ALIVE=-1
```

(Or set `ai_provider` / `ai_model` / `ollama_host` in `settings.json`, which `aiBrain` also reads.)

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/support-agent/message` | Handle an inbound message. Body: `{ storeId?, phone, message, customerName?, autoEscalate? }` |
| POST | `/api/support-agent/simulate` | Stateless one-off test |
| GET | `/api/support-agent/conversations/:phone` | Get conversation thread |
| DELETE | `/api/support-agent/conversations/:phone` | Reset a thread |
| POST | `/api/support-agent/conversations/:phone/mute` | Mute/unmute the bot for a contact |
| GET / PUT | `/api/support-agent/kb` | Read / update the knowledge base |
| GET | `/api/support-agent/health` | Provider + Ollama reachability + model |

### Example

```bash
curl -X POST http://localhost:3000/api/support-agent/message \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","message":"do you have the Pro plan and whats the price?"}'
```

```json
{
  "success": true,
  "reply": "Yes! The Pro plan is PKR 2,500/month and is delivered instantly. Want me to set it up?",
  "intent": "order",
  "shouldEscalate": false,
  "order": null,
  "model": "qwen2.5:32b",
  "source": "ollama"
}
```

## Hooking into live WhatsApp inbound

In the inbound message handler (the WhatsApp engine in `server.js`), for each incoming text call `/api/support-agent/message` (or `require('./ai/agents/supportAgent').handleMessage(...)` directly), then:

- send `result.reply` back to the customer,
- if `result.order` is set, create the order/checkout,
- if `result.shouldEscalate` is true, the thread is auto-muted and routed to a human (via `watiCopilot.escalateToHuman`).

Respect `thread.muted` so the bot stays quiet once a human takes over.

## Tests

```bash
node tests/smoke/supportAgentSmoke.js
```
