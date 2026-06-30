# AI Customer 360

The suite scatters what it knows about a person across many stores: lead score, chat history, orders, voice notes, win-back state, reviews, bookings. When an agent opens a chat they shouldn\'t have to hunt seven files. **Customer 360 merges everything for a phone number into one unified profile**, then the AI writes a one-glance summary + the suggested next move. Self-hosted Ollama; zero cloud cost.

## Why

Context is everything in support and sales. An agent who instantly sees "hot lead, escalated once, draft order PKR 2,500, 5-star past review, booking Wednesday" handles the chat ten times better. This is the single read that powers a smart inbox.

## How it works

```
phone → read (read-only) each feature\'s store → assemble unified profile (deterministic)
      → highlights chips + structured sections
      → AI one-glance summary + NEXT move (Ollama)  [templated fallback]
```

Sources merged (each optional, missing = skipped): lead intel (#11), support conversations + escalations (#1), orders/drafts (#25), voice notes (#7), win-back state (#36), reviews (#38), bookings (#46).

- **Deterministic, read-only assembly:** no store is mutated; the model only narrates assembled facts (never invents).
- **Works with no model:** returns the structured profile + a templated summary.
- **Zero new npm dependencies.**

## Files

- `lib/customer360/customer360.js` — buildProfile / profile / search.
- `routes/customer360Routes.js` — self-mountable router.
- `tests/smoke/customer360Smoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/customer-360', require('./routes/customer360Routes'));
```

## Environment

```
CUSTOMER360_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/customer-360/profile/:phone` | Unified profile + AI summary |
| GET | `/api/customer-360/raw/:phone` | Structured profile only (no AI) |
| GET | `/api/customer-360/search?band=hot&atRisk=true` | Inbox sidebar list |
| GET | `/api/customer-360/health` | Brain + sources |

### Example

```bash
curl localhost:3000/api/customer-360/profile/+92300xxxxxxx
# -> { profile:{ name, highlights:["hot (82)","escalated","order: draft"], lead:{...}, order:{...}, booking:{...} },
#      summary:"Ayesha is a hot lead (82) ... NEXT: send pricing and close.", source:"ollama" }
```

## Wiring into the inbox

1. When an agent opens a conversation, call `GET /profile/:phone` and render `summary` at the top + `highlights` as chips.
2. Use `GET /search?band=hot` (or `atRisk=true`) to power a prioritized inbox sidebar.
3. Pairs with the agent copilot (#9): the 360 summary gives context, the copilot drafts the reply.

## Tests

```bash
node tests/smoke/customer360Smoke.js
```
