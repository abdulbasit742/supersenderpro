# Local TTS Server (self-hosted, unlimited, keyless)

The HTTP wrapper that SuperSender Pro's `local_tts` voice provider calls. Runs on PC #1's
GPU. No API keys, no per-character limits, zero cost.

## Contract
```
POST /api/tts
request  { text, language, voice, engine, speed, format }
response { audio_base64, format, duration_sec, voice }
```
This matches `lib/voiceAI/providers/localTtsProvider.js` exactly.

## Run
```bash
cd local-tts-server
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                   # -> http://0.0.0.0:8001
```
Then in the app's `.env`:
```
VOICE_AI_DEFAULT_PROVIDER=local_tts
VOICE_AI_ALLOW_LIVE_TTS=true
VOICE_AI_DRY_RUN=false
LOCAL_TTS_URL=http://127.0.0.1:8001
LOCAL_TTS_ENGINE=gpt_sovits
```

## Wiring a real engine
The whole model call lives in one function: **`synth()`** in `app.py`. Out of the box it
returns a quiet placeholder tone so you can verify the pipeline end-to-end. Replace it with
your engine (GPT-SoVITS / Chatterbox / XTTS) — commented examples are right there in the
function docstring. Models are loaded once and kept warm in memory.

## Voice cloning
Drop reference samples in `./voices/` named by voice id (e.g. `voices/owner.wav`), then call
with `"voice": "owner"`. `default.wav` is used when `voice=default`. Keep consent handling
in the app layer (the provider already gates cloning behind consent + flags).

## Env
| var | default | meaning |
| --- | --- | --- |
| `LOCAL_TTS_HOST` | `0.0.0.0` | bind host |
| `LOCAL_TTS_PORT` | `8001` | bind port |
| `LOCAL_TTS_ENGINE` | `gpt_sovits` | default engine if request omits it |
| `LOCAL_TTS_FORMAT` | `wav` | default audio format |
| `LOCAL_TTS_VOICES_DIR` | `./voices` | reference samples for cloning |
