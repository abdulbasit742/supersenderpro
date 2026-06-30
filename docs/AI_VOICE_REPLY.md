# AI Voice Replies (self-hosted TTS)

The flip side of voice-note transcription (#7): instead of only **reading** customer voice notes, the bot can **answer with one**. This turns a text reply into a spoken WhatsApp voice note using a self-hosted TTS server — warmer, more human, and great for customers who prefer listening or can't read easily. Zero cloud cost, audio generated on-prem.

## Why

Voice notes are the native language of WhatsApp in this market. A bot that replies with a natural voice note feels human, not robotic, and reaches customers with low literacy or who just prefer audio. It's a standout most WhatsApp shops can't match.

## How it works

```
text reply → pick voice by language → TTS /v1/audio/speech (self-hosted, opus)
           → save data/voice_replies/<id>.ogg → send as WhatsApp voice note
```

Works with any OpenAI-compatible TTS server (OpenedAI-speech, Piper-backed, Kokoro-FastAPI). Outputs **opus/ogg**, the WhatsApp-friendly voice-note format.

- **Language-aware voice:** picks a sensible voice per language (English / Urdu / Roman Urdu / Hindi / Arabic), override per-call or via `VOICE_REPLY_VOICE_MAP`.
- **Length guard:** very long replies stay text (better read than heard); `force:true` overrides.
- **Graceful fallback:** TTS offline → returns `mode:'text'` so the caller just sends text. Never breaks.
- **Zero new npm dependencies.**

## Files

- `lib/voiceReply/ttsClient.js` — self-hosted TTS client.
- `lib/voiceReply/voiceReply.js` — speak() + voice selection + length guard + job log.
- `routes/voiceReplyRoutes.js` — self-mountable router.
- `tests/smoke/voiceReplySmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/voice-reply', require('./routes/voiceReplyRoutes'));
```

## Environment

```
TTS_HOST=http://<gpu-box-ip>:8001
TTS_MODEL=tts-1
TTS_VOICE=alloy
TTS_FORMAT=opus                 # WhatsApp voice-note friendly
VOICE_REPLY_MAX_CHARS=600       # longer replies stay text
VOICE_REPLY_VOICE_MAP={"ur":"nova","en":"alloy"}   # optional per-language override
```

Quick local server (example, OpenedAI-speech):

```bash
docker run -p 8001:8000 ghcr.io/matatonic/openedai-speech
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/voice-reply/speak` | Text → voice note. Body: `{ text, phone?, language?, voice?, force? }` |
| GET | `/api/voice-reply/file/:name` | Serve the generated audio |
| GET | `/api/voice-reply/jobs` | Recent jobs |
| GET | `/api/voice-reply/health` | TTS reachability + voice/format |

### Example

```bash
curl -X POST http://localhost:3000/api/voice-reply/speak \
  -H 'Content-Type: application/json' \
  -d '{"text":"Ji bilkul, ye 1500 rupay ka hai aur aaj hi deliver ho jayega.","language":"roman-ur"}'
# -> { mode:"voice", url:"/api/voice-reply/file/<id>.ogg", voice:"nova", ... }
```

## Wiring into live WhatsApp

After the support agent (#1) produces a reply:

1. Call `speak({ phone, text: reply, language })`.
2. If `mode === 'voice'`, read `file` from `data/voice_replies/` and send it as a voice note (whatsapp-web.js `MessageMedia` with `sendAudioAsVoice: true` / Baileys `audio` with `ptt: true`).
3. If `mode === 'text'` (too long or TTS down), just send the text reply.

Pairs perfectly with voice-note transcription (#7): customer speaks → you transcribe → agent answers → you speak back. A full voice-to-voice loop, all on your GPUs.

## Tests

```bash
node tests/smoke/voiceReplySmoke.js
```
