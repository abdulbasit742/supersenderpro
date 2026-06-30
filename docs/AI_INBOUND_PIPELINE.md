# AI Inbound Pipeline (the capstone)

The suite has many features. The WhatsApp engine should **not** have to call each one and stitch the results together. This is the **single entry point** that orchestrates the whole suite for one inbound message, in the right order, with every stage optional and degrading gracefully. Your engine calls one function; everything else happens behind it. All on self-hosted Ollama; zero cloud cost.

## Why

Up to now each feature was independent and self-mountable, great for incremental rollout. But in production you want ONE place that says: take this message, understand it (even if it's a voice note or photo, even if it's in Urdu), figure out intent, answer it safely, draft an order if needed, reply in the customer's language (or voice), and update the analytics. That's this.

## The pipeline

```
inbound message
  1. media -> text:   voice -> transcribe (#7) | image -> vision search (#23)
  2. guardrails in (#33):   sanitize, defang injection, redact PII
  3. translation in (#15):  customer language -> agent language
  4. intent router (#17):   classify + auto-tags + routing target
  5. support agent (#1):    generate the reply (RAG #3 if wired)
  6. order extraction (#25): if buying intent, draft a structured order
  7. guardrails out (#33):  moderate the reply
  8. translation out (#15):  agent language -> customer language
  9. voice reply (#35):     optionally speak the reply back
 10. telemetry:            send-time engagement (#21) + lead rescore (#11)
```

Every dependency is loaded **best-effort**. Missing or unreachable features are simply skipped and noted in the `trace`, so the pipeline runs with whatever subset of the suite you've installed/enabled, and **never throws** on a stage failure (only a missing `phone` is a hard error).

## Files

- `lib/inboundPipeline/inboundPipeline.js` — `handleInbound()` orchestrator.
- `routes/inboundPipelineRoutes.js` — self-mountable router (the one endpoint).
- `tests/smoke/inboundPipelineSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/inbound', require('./routes/inboundPipelineRoutes'));
```

## The single integration point in the WhatsApp engine

This replaces a tangle of per-feature calls with one:

```js
const pipeline = require('./lib/inboundPipeline/inboundPipeline');

// in your whatsapp-web.js / Baileys message handler:
async function onInbound(msg) {
  const phone = msg.from;
  let type = 'text', media = null, text = msg.body || '';
  if (msg.hasMedia) {
    const m = await msg.downloadMedia();
    media = Buffer.from(m.data, 'base64');
    type = m.mimetype.startsWith('audio') ? 'voice' : m.mimetype.startsWith('image') ? 'image' : 'text';
  }

  const r = await pipeline.handleInbound({ storeId, phone, text, type, media, options: { voiceReply: true } });

  if (r.reply) {
    if (r.replyMode === 'voice' && r.voiceFile) await sendVoiceNote(phone, r.voiceFile);
    else await sendText(phone, r.reply);
  }
  if (r.order && r.orderMissing && !r.orderMissing.length) await createOrder(r.order); // ready to confirm
  if (r.tags.length) await applyTags(phone, r.tags);
  if (r.shouldEscalate) await routeToHuman(phone, r.routing);
}
```

Respect the support agent\'s mute/escalation: if `shouldEscalate` is true, hand off to a human and stop auto-replying for that contact.

## Environment

The pipeline inherits each feature\'s own env (OLLAMA_HOST, WHISPER_HOST, TTS_HOST, AGENT_LANGUAGE, model vars, etc.). The only pipeline-level knob:

```
AGENT_LANGUAGE=en   # the language your agent/store operates in (for translation)
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/inbound/handle` | Run one message through the suite. Body: `{ phone, text?, type?, customerName?, options?, (media\|mediaBase64\|path) }` |
| GET | `/api/inbound/health` | Which suite features are currently wired |

### Example

```bash
curl -X POST http://localhost:3000/api/inbound/handle \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","text":"kitne ka hai red shirt? 2 chahiye","options":{"voiceReply":false}}'
# -> { reply:"...", intent:"sales", tags:["lead"], order:{items:[...]}, shouldEscalate:false, trace:[...] }
```

The `trace` array shows exactly which stages ran and their outcome, handy for debugging which features are active.

## Tests

```bash
node tests/smoke/inboundPipelineSmoke.js
```
