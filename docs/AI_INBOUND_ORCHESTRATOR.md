# AI Inbound Orchestrator (the capstone)

One function — `handleInbound()` — that turns a raw inbound WhatsApp message into a final, ready-to-send reply by chaining the **whole AI suite** in the right order. Instead of wiring ten features into your message handler by hand, you call this once. Every stage is **optional and best-effort**: each dependency is loaded via `try/require`, so the orchestrator runs with whatever subset of features you've merged and cleanly skips the rest.

## Why

You've built 19 AI features. This is the conductor that makes them play as one: the difference between "a pile of endpoints" and "a single intelligent inbound pipeline." One integration point in `server.js`, and the whole brain switches on.

## The pipeline

```
raw inbound (text | voice | image)
  → transcription (#7)      if voice note
  → vision search (#23)     if image
  → guardrails inbound (#33) sanitize + injection defense + PII redact
  → intent router (#17)     classify + tag + queue/priority
  → translation inbound (#15) to agent language (remembers customer lang)
  → CONFIRM? → order confirm (#25) + stop cart recovery (#31)
  → support agent (#1)      generate reply
  → order extraction (#25)  if buying intent (draft + summary)
  → translation outbound (#15) back to customer language
  → guardrails outbound (#33) moderation
  → voice reply (#35)       if the customer used voice
  → engagement log (#21)    for send-time learning
  → final reply + full trace
```

Every stage records to a `trace` so you can see exactly what fired (and what was skipped and why). **Zero new npm dependencies.**

## Files

- `lib/inboundOrchestrator/orchestrator.js` — `handleInbound()` + run log.
- `routes/orchestratorRoutes.js` — self-mountable router (text + multipart/base64 audio/image).
- `tests/smoke/orchestratorSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/orchestrator', require('./routes/orchestratorRoutes'));
```

## The single inbound integration

Replace the per-feature wiring in your WhatsApp engine with one call. For each incoming message:

```js
const orch = require('./lib/inboundOrchestrator/orchestrator');

// text
const run = await orch.handleInbound({ storeId, phone, text: msg.body });

// voice note
const run = await orch.handleInbound({ storeId, phone, audioBuffer: await msg.downloadMedia()... });

// image ("do you have this?")
const run = await orch.handleInbound({ storeId, phone, imageBuffer, text: msg.caption });

// then send:
if (run.reply.mode === 'voice' && run.reply.voiceFile) sendVoiceNote(phone, run.reply.voiceFile);
else sendText(phone, run.reply.text);

// and act on structure:
if (run.shouldEscalate) routeToHuman(phone);
if (run.routing) pushToQueue(run.routing.queue, run.routing.priority);
if (run.order) /* draft order ready */;
```

That's the whole inbound brain in one place.

## Environment

```
AGENT_LANGUAGE=en          # the language your agents work in (for translation)
OLLAMA_HOST=http://127.0.0.1:11434
```

Each underlying feature keeps its own env (models, hosts). The orchestrator adds none of its own beyond `AGENT_LANGUAGE`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/orchestrator/handle` | Run the full pipeline. Body: `{ phone, text?, audioBase64?, imageBase64?, wantVoiceReply? }` or multipart `audio`/`image` |
| GET | `/api/orchestrator/runs` | Recent pipeline runs (with traces) |
| GET | `/api/orchestrator/health` | Which features are installed |

### Example

```bash
curl -X POST http://localhost:3000/api/orchestrator/handle \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","text":"kitne ka hai red shirt? deliver to Lahore"}'
# -> { reply:{text:"...",mode:"text"}, intent:"sales", routing:{queue:"sales",priority:"high"}, order:{...}, trace:{stages:[...]} }
```

## Tests

```bash
node tests/smoke/orchestratorSmoke.js
```
