# Unlimited Self-Hosted Voice + Video

Two features, both running on **your own GPUs** (2x RTX A6000). No API keys, no per-unit
limits, zero marginal cost, fully on-prem. Both are **dry-run by default** and only call
your local servers when you explicitly flip the live flags.

## 1. Voice (unlimited TTS + cloning) — wired into the existing `lib/voiceAI`

A new provider `local_tts` was added to the existing Voice AI registry. It talks to a
local **GPT-SoVITS / Chatterbox / XTTS** HTTP server on PC #1.

- New: `lib/voiceAI/providers/localTtsProvider.js` (real HTTP call, fails safe to mock)
- Edited: `lib/voiceAI/providerConfig.js` (added `local_tts` capability entry)
- Edited: `lib/voiceAI/providers/index.js` (wired the `local_tts` case)

The provider contract is identical to the existing ones, so the TTS engine, queue,
WhatsApp/Telegram/social voice adapters, templates and approval workflow all work
unchanged — just select `local_tts`.

**Local TTS server contract** (whatever you run on PC #1 should expose this):
`POST {LOCAL_TTS_URL}{LOCAL_TTS_PATH}` with JSON `{ text, language, voice, engine, speed, format }`
and respond with JSON `{ audio_base64, format, duration_sec, voice }` **or** `{ audio_url, duration_sec }`.
For GPT-SoVITS / Chatterbox, a ~30-line FastAPI wrapper around their inference call is enough.

Go live:
```
VOICE_AI_DEFAULT_PROVIDER=local_tts
VOICE_AI_ALLOW_LIVE_TTS=true
VOICE_AI_DRY_RUN=false
LOCAL_TTS_URL=http://127.0.0.1:8001
```

## 2. Video (unlimited short-video generation) — new `lib/videoAI` module

A new module mirroring the voiceAI pattern, with a `local_video` provider that talks to a
local **WanGP / ComfyUI / MoneyPrinterTurbo** HTTP server on PC #2.

- `lib/videoAI/config.js`, `providerConfig.js`, `providerRegistry.js`
- `lib/videoAI/providers/{index,mockProvider,localVideoProvider}.js`
- `lib/videoAI/videoEngine.js` (`generate()` / `previewOnly()`), `lib/videoAI/index.js`
- `routes/videoAIRoutes.js` (`/api/video-ai/status|providers|generate|preview`)

**Local video server contract** (PC #2):
`POST {LOCAL_VIDEO_URL}{LOCAL_VIDEO_PATH}` with JSON `{ prompt, image_url, resolution, duration_sec, engine, format }`
and respond with JSON `{ video_base64, format, duration_sec, resolution }` **or** `{ video_url, duration_sec }`.

Go live:
```
VIDEO_AI_DEFAULT_PROVIDER=local_video
VIDEO_AI_ALLOW_LIVE_GENERATE=true
VIDEO_AI_DRY_RUN=false
LOCAL_VIDEO_URL=http://127.0.0.1:8002
```

### One-line mount (server.js)
Add next to the other route mounts:
```js
app.use('/api/video-ai', require('./routes/videoAIRoutes'));
```

All env vars are listed in `.env.unlimited-media.example`.
