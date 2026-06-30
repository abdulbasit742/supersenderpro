// lib/voiceNoteAI/whisperClient.js
// ────────────────────────────────────────────────────────────────────
// Speech-to-text via a self-hosted Whisper server. Works with any OpenAI-
// compatible transcription endpoint (faster-whisper-server, whisper.cpp server,
// Speaches, etc.) exposing POST /v1/audio/transcriptions. Runs on your own GPU
// box — zero cloud cost, audio never leaves your machines.
//
// No SDK / no new npm deps: global fetch + FormData/Blob (Node >= 18).
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');

const HOST = () => process.env.WHISPER_HOST || 'http://127.0.0.1:8000';
const MODEL = () => process.env.WHISPER_MODEL || 'Systran/faster-whisper-large-v3';

/**
 * Transcribe an audio buffer.
 * @param {Buffer} buffer - audio bytes (ogg/opus, mp3, wav, m4a...)
 * @param {object} [opts]
 * @param {string} [opts.filename='voice.ogg']
 * @param {string} [opts.language] - ISO code hint (e.g. 'ur','en'); omit to auto-detect
 * @returns {Promise<{ text, language, raw }>}
 */
async function transcribeBuffer(buffer, { filename = 'voice.ogg', language } = {}) {
  if (!buffer || !buffer.length) throw new Error('empty audio buffer');
  const form = new FormData();
  form.append('file', new Blob([buffer]), filename);
  form.append('model', MODEL());
  form.append('response_format', 'json');
  if (language) form.append('language', language);

  const res = await fetch(`${HOST()}/v1/audio/transcriptions`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Whisper HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { text: (data.text || '').trim(), language: data.language || language || 'und', raw: data };
}

async function transcribeFile(filePath, opts = {}) {
  const buf = fs.readFileSync(filePath);
  return transcribeBuffer(buf, { filename: filePath.split(/[\\/]/).pop(), ...opts });
}

async function ping() {
  try {
    // Most OpenAI-compatible servers expose /v1/models or at least respond on root.
    const res = await fetch(`${HOST()}/v1/models`, { method: 'GET' });
    return res.ok;
  } catch { return false; }
}

module.exports = { transcribeBuffer, transcribeFile, ping, HOST, MODEL };
