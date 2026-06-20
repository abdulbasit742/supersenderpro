# ElevenLabs Setup (placeholders only)

ElevenLabs provides high-quality TTS and optional voice cloning. In this repo it is **dry-run by
default** and the live HTTP call is intentionally not implemented, so no audio is generated or sent
until you enable it deliberately.

## Env placeholders (in `.env`, never commit real values)
```
ELEVENLABS_API_KEY=
ELEVENLABS_DEFAULT_VOICE_ID=
ELEVENLABS_MODEL_ID=
ELEVENLABS_LIVE_TEST=false
```

## To enable live ElevenLabs TTS (later)
1. Put your real key in `.env` → `ELEVENLABS_API_KEY=...` (keep it out of git).
2. Set `VOICE_AI_DRY_RUN=false` and `VOICE_AI_ALLOW_LIVE_TTS=true`.
3. Record consent: `POST /api/voice-ai/consent/:subjectId { "externalProviderOptIn": true }`.
4. Implement the fetch to `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}` inside
   `lib/voiceAI/providers/elevenlabsProvider.js` (marked with a TODO).

## Voice cloning
Cloning is **off** by default. It additionally requires `VOICE_AI_ALLOW_VOICE_CLONING=true` and a
per-subject `voiceCloneOptIn: true`. Never upload a real customer's audio without explicit consent.
