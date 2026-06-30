# Real-Time Chat Translation (self-hosted Ollama)

Two-way live translation for WhatsApp chats. A customer writes in **any language**; your agent reads it in theirs and replies in theirs; the customer receives it back **in their own language**. All on your **self-hosted Ollama** — zero cost, on-prem, no per-character cloud bill.

## Why

You can sell to customers who don't share your team's language: Urdu, Arabic, Hindi, Spanish, whatever. The agent works in one language; the customer never knows there's a translation layer. Opens up markets without hiring multilingual staff.

## How it works

```
inbound:  customer msg → detect lang → translate → agent language   (+ remember customer lang)
outbound: agent reply  → translate → customer's remembered language → send
```

- **Per-contact language memory:** once a customer's language is detected on inbound, outbound replies auto-target it, the agent doesn't have to pick.
- **Cache:** identical strings aren't re-translated.
- **Graceful passthrough:** if the model is offline, text passes through unchanged (marked `passthrough`) so the chat never blocks.
- **Zero new npm dependencies.**

## Files

- `lib/translation/translator.js` — detect / translate / inbound / outbound + contact-lang memory.
- `routes/translationRoutes.js` — self-mountable router.
- `tests/smoke/translationSmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/translation', require('./routes/translationRoutes'));
```

## Environment

```
TRANSLATION_MODEL=qwen2.5:32b   # defaults to SUPPORT_AGENT_MODEL, then qwen2.5:32b
AGENT_LANGUAGE=en               # the language your human agents work in
OLLAMA_HOST=http://127.0.0.1:11434
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/translation/detect` | Detect a message's language |
| POST | `/api/translation/translate` | Translate text. Body: `{ text, to, from? }` |
| POST | `/api/translation/inbound` | Customer → agent lang (records customer lang). Body: `{ phone, text, agentLang? }` |
| POST | `/api/translation/outbound` | Agent → customer lang. Body: `{ phone, text, to? }` |
| GET | `/api/translation/health` | Brain status + cache size |

### Example

```bash
curl -X POST http://localhost:3000/api/translation/inbound \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+92300xxxxxxx","text":"\u06A9\u06CC\u0627 \u06CC\u06C1 \u0627\u0633\u0679\u0627\u06A9 \u0645\u06CC\u06BA \u06C1\u06D2\u061F","agentLang":"en"}'
# -> { success:true, text:"Is this in stock?", customerLang:"ur", agentLang:"en" }
```

## Wiring into live WhatsApp

- **Inbound:** on each incoming message, call `translateInbound({ phone, text })` and show the agent the translated text (keep the original visible too). This also records the customer's language.
- **Outbound:** before sending an agent's reply, call `translateOutbound({ phone, text })` and send the translated result.
- Pairs with the support agent (it already replies in the customer's language) and the agent copilot (draft in English, auto-translate on send).

## Tests

```bash
node tests/smoke/translationSmoke.js
```
