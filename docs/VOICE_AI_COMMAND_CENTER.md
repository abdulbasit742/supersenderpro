# Voice AI Command Center

The Voice AI Command Center lets a business owner talk to clients using voice: send voice
replies, generate AI voice agents, transcribe client voice notes, summarize them, and create
voiceovers for products, channels and social posts — across Urdu, Roman Urdu and English.

It is built as a self-contained module (`lib/voiceAI/`) with safe adapters around the existing
WhatsApp, CRM, ecommerce, Flow Studio and admin systems. **It does not rebuild any of them.**

## Safety model (read this first)
Everything is **dry-run** and **approval-protected by default**:
- No external provider (ElevenLabs/OpenAI/Google/Azure/AWS/Deepgram) is ever called unless you
  explicitly enable it in `.env`.
- The default provider is `mock_dry_run`, which produces previews and never touches the network.
- Voice generation and sending always create a **draft** that requires admin approval.
- Voice cloning is **disabled** and requires explicit per-subject consent.
- Raw audio is **not stored** by default; transcripts and text are not stored by default.
- All previews are **redacted** (phones, emails, tokens, payment references are masked).

## Dry-run behavior
`VOICE_AI_DRY_RUN=true` (default) forces every TTS/STT/send into preview mode. The engines return
a structured result with `dryRun: true`, a masked preview, and `approvalRequired: true`. To go live
later you must set the specific `VOICE_AI_ALLOW_LIVE_*` flag **and** `VOICE_AI_DRY_RUN=false`, plus
provide the provider API key and per-subject consent.

## How it fits together
1. A client voice note arrives (WhatsApp/Telegram/upload) → `whatsappVoiceAdapter.onVoiceNote()`.
2. STT engine produces a **dry-run transcript preview** + intent + sentiment.
3. Conversation manager records it, builds a **summary** and a **suggested reply**.
4. A voice reply **draft** is queued — `approval_pending`.
5. Admin approves via dashboard or `!voiceapprove [id]`.
6. Only if live mode + consent are enabled does anything leave the system; otherwise a **manual
   action packet** is returned for the operator to act on.

## Key files
- `lib/voiceAI/` — all engines, stores, adapters, agents, templates, queue, doctor.
- `routes/voiceAIRoutes.js` — mounted at `/api/voice-ai`.
- `public/voice-ai.html` (+ `js/voice-ai.js`, `css/voice-ai.css`) — dashboard.
- `scripts/voice-ai-check.js` — `npm run voice-ai:check`.
- `tests/smoke/voiceAISmoke.js` — `npm run voice-ai:smoke`.

## Run the health check
```
npm run voice-ai:check
```

## Run smoke tests (offline, no API keys)
```
npm run voice-ai:smoke
```
