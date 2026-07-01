# Agent Copilot (AI assist for human agents)

When a chat escalates to a human (see the support agent), the human still has to type fast and on-brand. The Copilot gives them, all on your **self-hosted Ollama**:

- **2-3 suggested reply drafts** for the customer's latest message,
- a **thread summary** so they can pick up context instantly,
- on-demand **tone rewrites** of a draft (friendly / formal / apologetic / concise, or translate to Urdu / Roman Urdu).

Zero cloud cost, on-prem, and it reuses the same brain + knowledge as the auto-agent so suggestions stay consistent with what the bot would say.

## Why

Full automation handles the easy 80%. The escalated 20% is where deals are won or lost, and that's where a human + AI copilot beats either alone: faster replies, fewer mistakes, consistent voice.

## Architecture

```
agent opens an escalated chat
  → summarizeThread()  (history from support agent)  → 2-3 line summary
  → suggestReplies()   (history + RAG context, via Ollama) → 3 draft replies
  → agent edits / picks → rewriteTone() to adjust voice → send
```

Pulls conversation history from the support agent's store and relevant knowledge from the RAG store **when those features are present** (both optional). Works standalone with canned fallbacks if the model is offline. **Zero new npm dependencies.**

## Files

- `lib/agentCopilot/agentCopilot.js` — suggest / summarize / rewrite + health.
- `routes/agentCopilotRoutes.js` — self-mountable router.
- `tests/smoke/agentCopilotSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/agent-copilot', require('./routes/agentCopilotRoutes'));
```

## Environment

```
COPILOT_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/agent-copilot/suggest` | 2-3 reply drafts. Body: `{ phone }` or `{ customerMessage }` |
| POST | `/api/agent-copilot/summary` | Thread summary. Body: `{ phone }` |
| POST | `/api/agent-copilot/rewrite` | Tone rewrite. Body: `{ draft, tone }` |
| GET | `/api/agent-copilot/health` | Brain + wiring status |

### Example

```bash
curl -X POST http://localhost:3000/api/agent-copilot/suggest \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx"}'
# -> { success:true, suggestions:["...","...","..."], source:"ollama" }
```

## Wiring into the shared inbox

In the agent inbox UI, when an agent opens an escalated conversation:

1. Call `/summary` to show a one-glance recap at the top.
2. Call `/suggest` to show 3 clickable draft chips above the input box.
3. When the agent tweaks a draft, offer `/rewrite` buttons (Friendly / Formal / Urdu) before sending.

This pairs directly with the support agent's escalation: the moment `shouldEscalate` fires and a human takes the chat, the copilot is ready.

## Tests

```bash
node tests/smoke/agentCopilotSmoke.js
```
