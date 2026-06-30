// lib/voiceReply/ttsClient.js
// ────────────────────────────────────────────────────────────────────
// Text-to-speech via a self-hosted TTS server. Works with any OpenAI-compatible
// speech endpoint (OpenedAI-speech, Piper-backed servers, Kokoro-FastAPI, etc.)
// exposing POST /v1/audio/speech. Runs on your own GPU/CPU box — zero cloud cost,
// audio generated on-prem.
//
// No SDK / no new npm deps: global fetch (Node >= 18).
// ────────────────────────────────────────────────────────────────────

const HOST = () => process.env.TTS_HOST || 'http://127.0.0.1:8001';
const MODEL = () => process.env.TTS_MODEL || 'tts-1';
const DEFAULT_VOICE = () => process.env.TTS_VOICE || 'alloy';
const FORMAT = () => process.env.TTS_FORMAT || 'opus'; // opus = WhatsApp-friendly voice note

/**
 * Synthesize speech. Returns { bytes:Buffer, format, voice }.
 * @param {string} text
 * @param {object} [opts] { voice?, format?, speed? }
 */
async function synthesize(text, { voice, format, speed = 1.0 } = {}) {
  if (!text || !String(text).trim()) throw new Error('text is required');
  const body = {
    model: MODEL(),
    input: String(text),
    voice: voice || DEFAULT_VOICE(),
    response_format: format || FORMAT(),
    speed
  };
  const res = await fetch(`${HOST()}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`TTS HTTP ${res.status}: ${await res.text()}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (!bytes.length) throw new Error('TTS returned empty audio');
  return { bytes, format: body.response_format, voice: body.voice };
}

async function ping() {
  try { const r = await fetch(`${HOST()}/v1/models`, { method: 'GET' }); return r.ok; }
  catch { return false; }
}

module.exports = { synthesize, ping, HOST, MODEL, DEFAULT_VOICE, FORMAT };
