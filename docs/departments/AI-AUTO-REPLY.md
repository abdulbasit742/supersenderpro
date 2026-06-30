# Feature #14 — AI Auto-Reply (Smart Responder)

Answer common inbound messages **automatically** with an intent-aware assistant that routes
through the project's AI Brain Bridge (`lib/llmHub`) when available, grounded in an editable FAQ
knowledge base — and hands off to a human when it isn't confident.

## Why
SuperSender could send/receive and (with #3) ticket messages, but every reply was manual. Most
inbound volume is repetitive (pricing, trial, hours, refunds). An auto-responder that's safe by
default (suggests, doesn't send) deflects that volume while protecting the customer experience
with confidence thresholds, business hours, cooldowns, and a kill switch.

## What it does
- **Routes through `lib/llmHub`** when present (provider-agnostic: openai/anthropic/gemini/groq/
  ollama/mock). If the hub is absent or a dry-run is requested, a deterministic local fallback
  is used, so the department always works offline + in tests.
- **FAQ knowledge base:** editable Q/A pairs with keyword hints (4 seeded defaults). Used both
  for matching and as grounding context for the LLM.
- **Intent + confidence:** keyword scoring yields a confidence in [0,1]. Below `minConfidence`
  → human handoff instead of guessing.
- **Human handoff:** explicit "talk to a human / agent / manager" always hands off.
- **Business hours:** outside the window, sends an after-hours notice (or handoff) instead of a
  full answer.
- **Per-contact cooldown:** avoids rapid-fire auto-replies.
- **Kill switch:** `AI_AUTO_REPLY_KILL_SWITCH=true` stops everything instantly.
- **Suggest-mode by default:** replies are drafted, never sent, until live send + a notifier.

## Files
- `lib/aiAutoReply/config.js` — env posture (suggest-only, confidence, hours, cooldown, kill switch)
- `lib/aiAutoReply/store.js` — atomic JSON store (`data/ai-auto-reply.json`)
- `lib/aiAutoReply/privacy.js` — contact masking for views
- `lib/aiAutoReply/faqStore.js` — FAQ knowledge base CRUD + defaults
- `lib/aiAutoReply/llmBridge.js` — best-effort bridge to `lib/llmHub` + local fallback
- `lib/aiAutoReply/intent.js` — keyword intent match + confidence + human-request detection
- `lib/aiAutoReply/notify.js` — single outbound hook (`setNotifier`), masks targets
- `lib/aiAutoReply/responder.js` — the decision/answer core
- `lib/aiAutoReply/doctor.js` — offline self-check + posture
- `lib/aiAutoReply/index.js` — barrel
- `routes/aiAutoReplyRoutes.js` — REST surface (`/api/ai-auto-reply`)
- `scripts/ai-auto-reply-check.js`, `tests/smoke/aiAutoReplySmoke.js`

## Wiring (server.js — 2 lines, file itself untouched: 2.1MB, blind-rewrite risky)
```js
const aiAutoReplyRoutes = require('./routes/aiAutoReplyRoutes');
app.use('/api/ai-auto-reply', aiAutoReplyRoutes);
// optional: require('./lib/aiAutoReply').setNotifier(async (to,msg)=>waClient.sendMessage(to,msg));
```
In the WhatsApp inbound handler, ask it for a decision per message:
```js
const r = await require('./lib/aiAutoReply').responder.handle({ contact: from, text: body });
// r.action: reply | handoff | after_hours | skip | noop ; r.reply.preview holds the drafted text
```
Great paired with #3 (Support Inbox): hand off (`action:'handoff'`) → open a ticket.

## Endpoints (`/api/ai-auto-reply`)
- `GET /status`, `GET /doctor`, `GET /overview`
- `POST /handle` `{ contact, text }` → decision + drafted reply
- `GET /faqs`, `POST /faqs` `{ id, keywords, question, answer }`, `DELETE /faqs/:id`
- `GET /recent`

## Safety
Routes through the existing AI hub (no new provider, no new dependency); local fallback when
absent. **Suggest-only** until `AI_AUTO_REPLY_LIVE=true` + a notifier. Kill switch halts
everything. Confidence threshold + business hours + cooldown protect the customer. Contacts
masked in views. 100% additive; no existing module/route/data changed.

## Env
```
AI_AUTO_REPLY_ENABLED=true
AI_AUTO_REPLY_KILL_SWITCH=false
AI_AUTO_REPLY_LIVE=false                    # true + notifier => replies actually send
AI_AUTO_REPLY_MIN_CONFIDENCE=0.55
AI_AUTO_REPLY_COOLDOWN_MINUTES=2
AI_AUTO_REPLY_BUSINESS_START_HOUR=9
AI_AUTO_REPLY_BUSINESS_END_HOUR=21
AI_AUTO_REPLY_MAX_REPLY_CHARS=600
```

## Verify
```bash
for f in lib/aiAutoReply/*.js; do node --check "$f"; done
node --check routes/aiAutoReplyRoutes.js
npm run ai-auto-reply:check
npm run ai-auto-reply:smoke
```

Feature #14 done. Agle number ka intezaar.
