"""
Local TTS server for SuperSender Pro — self-hosted, unlimited, keyless.

This is the small HTTP wrapper that the app's `local_tts` voice provider
(lib/voiceAI/providers/localTtsProvider.js) talks to. It runs on PC #1's GPU.

Contract (must match the provider exactly):

  POST {LOCAL_TTS_URL}{LOCAL_TTS_PATH}     (default http://127.0.0.1:8001/api/tts)
  request  JSON: { text, language, voice, engine, speed, format }
  response JSON: { audio_base64, format, duration_sec, voice }
               (or { audio_url, duration_sec } if you serve files yourself)

There are NO API keys. The whole point is on-prem, zero-cost, unlimited generation
on your own 2x RTX A6000.

The actual model call lives in ONE place: `synth()`. Everything else (HTTP, base64,
duration, validation) is engine-agnostic. Drop your GPT-SoVITS / Chatterbox / XTTS
inference into `synth()` and you're done.

Quick start:
  python -m venv .venv && . .venv/bin/activate      # (Windows: .venv\\Scripts\\activate)
  pip install -r requirements.txt
  python app.py                                      # serves on 0.0.0.0:8001
"""

import base64
import io
import os
import wave
import struct
import math
import logging
from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

log = logging.getLogger("local-tts")
logging.basicConfig(level=logging.INFO)

HOST = os.getenv("LOCAL_TTS_HOST", "0.0.0.0")
PORT = int(os.getenv("LOCAL_TTS_PORT", "8001"))
DEFAULT_ENGINE = os.getenv("LOCAL_TTS_ENGINE", "gpt_sovits")
DEFAULT_FORMAT = os.getenv("LOCAL_TTS_FORMAT", "wav")
# Where your reference voice samples live (for cloning engines like GPT-SoVITS / XTTS).
VOICES_DIR = os.getenv("LOCAL_TTS_VOICES_DIR", "./voices")

app = FastAPI(title="SuperSender Local TTS", version="1.0.0")


class TTSRequest(BaseModel):
    text: str = ""
    language: Optional[str] = "roman_urdu"
    voice: Optional[str] = "default"
    engine: Optional[str] = None          # gpt_sovits | chatterbox | xtts | piper
    speed: Optional[float] = 1.0
    format: Optional[str] = None           # wav | mp3


# ---------------------------------------------------------------------------
# Engines are lazy-loaded ONCE and kept warm in module globals, so repeated
# requests don't reload the model (which is the slow part on a 48GB card).
# ---------------------------------------------------------------------------
_ENGINES = {}


def _load_engine(name: str):
    """Lazy, cached model load. Replace the bodies with real inference handles."""
    if name in _ENGINES:
        return _ENGINES[name]

    log.info("Loading TTS engine: %s", name)

    if name == "gpt_sovits":
        # from GPT_SoVITS.inference import load_model
        # handle = load_model(
        #     sovits_path=os.getenv("GPT_SOVITS_MODEL"),
        #     gpt_path=os.getenv("GPT_SOVITS_GPT"),
        #     device="cuda",
        # )
        handle = {"name": "gpt_sovits", "ready": True}

    elif name == "chatterbox":
        # from chatterbox.tts import ChatterboxTTS
        # handle = ChatterboxTTS.from_pretrained(device="cuda")
        handle = {"name": "chatterbox", "ready": True}

    elif name == "xtts":
        # from TTS.api import TTS
        # handle = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
        handle = {"name": "xtts", "ready": True}

    else:
        handle = {"name": name, "ready": True}

    _ENGINES[name] = handle
    return handle


def _voice_ref(voice: str) -> Optional[str]:
    """Resolve a voice id to a reference audio file path (for cloning engines)."""
    if not voice or voice == "default":
        cand = os.path.join(VOICES_DIR, "default.wav")
        return cand if os.path.exists(cand) else None
    for ext in (".wav", ".mp3", ".flac"):
        cand = os.path.join(VOICES_DIR, f"{voice}{ext}")
        if os.path.exists(cand):
            return cand
    return None


def synth(text: str, language: str, voice: str, engine: str, speed: float, fmt: str) -> bytes:
    """
    THE ONE SEAM. Return raw audio bytes (wav or mp3) for `text`.

    Replace the placeholder below with your real model call. Examples:

      GPT-SoVITS:
        wav = handle.infer(text=text, ref_wav=_voice_ref(voice),
                           prompt_language=language, speed=speed)
        return wav_to_bytes(wav, sample_rate=32000)

      Chatterbox:
        wav = handle.generate(text, audio_prompt_path=_voice_ref(voice))
        return wav_to_bytes(wav, sample_rate=handle.sr)

      XTTS:
        handle.tts_to_file(text=text, speaker_wav=_voice_ref(voice),
                           language=_xtts_lang(language), file_path="/tmp/o.wav")
        return open("/tmp/o.wav", "rb").read()
    """
    handle = _load_engine(engine)  # noqa: F841  (kept warm; used by real inference)
    # --- PLACEHOLDER: a short silent/again tone so the pipeline works end-to-end ---
    # Delete this and return real model bytes from the engine above.
    return _placeholder_tone(text)


def _placeholder_tone(text: str, sample_rate: int = 22050) -> bytes:
    """Deterministic placeholder WAV (~150 wpm of soft tone). Remove once real engine is wired."""
    words = max(1, len(text.split()))
    seconds = max(0.5, min(60.0, (words / 150.0) * 60.0))
    n = int(sample_rate * seconds)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for i in range(n):
            # very quiet 220Hz tone so it's obviously a placeholder
            sample = int(1200 * math.sin(2 * math.pi * 220 * (i / sample_rate)))
            w.writeframes(struct.pack("<h", sample))
    return buf.getvalue()


def _wav_duration_sec(wav_bytes: bytes) -> float:
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as w:
            frames = w.getnframes()
            rate = w.getframerate() or 1
            return round(frames / float(rate), 3)
    except Exception:
        return 0.0


@app.get("/health")
def health():
    return {"ok": True, "engine": DEFAULT_ENGINE, "loaded": list(_ENGINES.keys())}


@app.post("/api/tts")
def tts(req: TTSRequest):
    text = (req.text or "").strip()
    if not text:
        return JSONResponse(status_code=400, content={"ok": False, "error": "empty_text"})

    engine = (req.engine or DEFAULT_ENGINE).lower()
    fmt = (req.format or DEFAULT_FORMAT).lower()
    voice = req.voice or "default"
    speed = float(req.speed or 1.0)
    language = req.language or "roman_urdu"

    try:
        audio_bytes = synth(text, language, voice, engine, speed, fmt)
    except Exception as e:  # never leak a stack to the caller
        log.exception("synth failed")
        return JSONResponse(status_code=500, content={"ok": False, "error": f"synth_failed: {e}"})

    duration = _wav_duration_sec(audio_bytes) if fmt == "wav" else 0.0
    return {
        "ok": True,
        "audio_base64": base64.b64encode(audio_bytes).decode("ascii"),
        "format": fmt,
        "duration_sec": duration,
        "voice": voice,
        "engine": engine,
    }


if __name__ == "__main__":
    log.info("Local TTS server on http://%s:%s  (engine=%s)", HOST, PORT, DEFAULT_ENGINE)
    uvicorn.run(app, host=HOST, port=PORT)
