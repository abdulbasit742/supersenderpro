# Voice-Note AI (self-hosted Whisper)

Customers love sending **WhatsApp voice notes**. This transcribes them on your own GPU box with Whisper, then routes the transcript through the same conversational support agent (local Ollama) to produce a reply, intent and escalation decision. Audio never leaves your machines; transcription cost is zero.

## Why

A huge share of WhatsApp messages in Pakistan/South Asia are voice notes. Text-only bots ignore them. Handling voice locally means you understand every customer, in Urdu/Roman-Urdu/English, at zero marginal cost.

## Architecture

```
voice note (ogg/opus) → Whisper /v1/audio/transcriptions (self-hosted GPU)
   → transcript → supportAgent.handleMessage (local Ollama)
   → { reply, intent, shouldEscalate, order }
```

Works with any OpenAI-compatible Whisper server (faster-whisper-server, whisper.cpp server, Speaches). Two modes:

- **transcribe** — audio → text only.
- **handle** — audio → text → agent reply (reuses feature #1's brain, so voice notes get the exact same answers as text).

**Graceful fallback:** if Whisper is unreachable the job is marked `transcription_failed` and the customer is asked to type + routed to a human. If the agent errors, the transcript is still saved. The API never hard-fails.

**Zero new npm dependencies** (global `fetch` + `FormData`/`Blob`; reuses `multer`, already in package.json, for multipart uploads).

## Files

- `lib/voiceNoteAI/whisperClient.js` — Whisper transcription client.
- `lib/voiceNoteAI/voiceNoteAI.js` — pipeline: transcribe (+ optional agent reply), job log, health.
- `routes/voiceNoteRoutes.js` — self-mountable router (multipart / base64 / path input).
- `tests/smoke/voiceNoteAISmoke.js` — offline smoke test.

## Wiring it up (one line in server.js)

```js
app.use('/api/voice-note', require('./routes/voiceNoteRoutes'));
```

## Environment

Point at your Whisper box (can be PC #2):

```
WHISPER_HOST=http://<gpu-box-ip>:8000
WHISPER_MODEL=Systran/faster-whisper-large-v3
```

Quick local server (example, faster-whisper-server):

```bash
docker run --gpus all -p 8000:8000 fedirz/faster-whisper-server:latest-cuda
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/voice-note/transcribe` | Audio → transcript only |
| POST | `/api/voice-note/handle` | Audio → transcript + agent reply (needs `phone`) |
| GET | `/api/voice-note/jobs` | Recent jobs (filter by storeId/phone) |
| GET | `/api/voice-note/jobs/:id` | One job |
| GET | `/api/voice-note/health` | Whisper reachability + agent wiring |

Audio can be sent as multipart field `audio`, JSON `audioBase64`, or a server-local `path`.

### Example

```bash
curl -X POST http://localhost:3000/api/voice-note/handle \
  -F audio=@note.ogg -F phone=+92300xxxxxxx
# -> { success:true, transcript:"kitne ka hai?", reply:"...", intent:"order", ... }
```

## Wiring into live WhatsApp inbound

In the WhatsApp engine, when an inbound message is a voice note (`ptt`/audio):

1. Download the media buffer (whatsapp-web.js `msg.downloadMedia()` / Baileys `downloadMediaMessage`).
2. Call `require('./lib/voiceNoteAI/voiceNoteAI').handleVoiceNote({ buffer, phone, storeId })`.
3. Send `result.reply` back to the customer.
4. If `result.shouldEscalate`, hand off to a human (mute the bot for that contact).

## Tests

```bash
node tests/smoke/voiceNoteAISmoke.js
```
