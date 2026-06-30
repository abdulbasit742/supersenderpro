# AI Intent Router + Auto-Tagging + Smart Routing

Every inbound WhatsApp message gets **classified into an intent** (sales / support / billing / complaint / shipping / greeting / spam / other), **auto-tagged**, and **routed** to the right queue/team with a priority. No more one undifferentiated inbox where hot leads sit next to spam. Runs on your **self-hosted Ollama** for the hard cases; instant keyword classification for the rest.

## Why

The support agent answers; the lead-intel engine scores; this decides **where each message goes**. A complaint should jump to escalations as `urgent`; a price question should hit the sales queue as `high`; spam should be quarantined. Routing is what turns a busy number into an organized operation.

## Two tiers

1. **Deterministic keyword classifier** — always on, instant, explainable (returns per-intent scores + confidence).
2. **AI classifier** — only invoked for low-confidence messages, asks the AI Brain Bridge (Ollama) to pick from the fixed intent set. Falls back to the keyword result if the model is offline.

## Architecture

```
inbound msg → classifyKeyword (always) → confident? ─yes→ use it
                                       └no→ classifyAI (Ollama) → use it (or keyword fallback)
            → store routing rules → { intent, tags[], routing:{queue,team,priority} }
```

Routing rules (`intent → {queue, team, priority}`) and the tag map are **configurable per store** and file-backed. **Zero new npm dependencies.**

## Files

- `lib/intentRouter/intentRouter.js` — classify + route + rules + health.
- `routes/intentRouterRoutes.js` — self-mountable router.
- `tests/smoke/intentRouterSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/intent-router', require('./routes/intentRouterRoutes'));
```

## Environment

```
INTENT_ROUTER_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/intent-router/classify` | Intent only. Body: `{ text, useAI? }` |
| POST | `/api/intent-router/route` | Intent + tags + routing. Body: `{ storeId?, text }` |
| GET | `/api/intent-router/rules` | Current routing + tag rules |
| PUT | `/api/intent-router/rules` | Update rules. Body: `{ routing?, tagMap? }` |
| GET | `/api/intent-router/health` | Brain status + intent set |

### Example

```bash
curl -X POST http://localhost:3000/api/intent-router/route \
  -H 'Content-Type: application/json' \
  -d '{"text":"I want a refund, this is a scam"}'
# -> { intent:"complaint", routing:{queue:"escalations",team:"lead",priority:"urgent"}, tags:["at-risk","complaint"] }
```

## Wiring into live WhatsApp inbound

On each incoming message, before (or alongside) the support agent:

1. `route({ storeId, text })` → get `{ intent, tags, routing }`.
2. Apply `tags` to the contact/conversation (pairs with the existing tagging in `routes/wati.js`).
3. Push the conversation into `routing.queue` for `routing.team` at `routing.priority`.
4. Let the support agent handle the reply; complaints/urgent can skip straight to a human.

## Tests

```bash
node tests/smoke/intentRouterSmoke.js
```
