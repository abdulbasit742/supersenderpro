'use strict';
/**
 * voiceNoteAI.js — Voice Feature #1: understand WhatsApp voice notes.
 *
 * Many customers (especially in the Pakistan market) send voice notes instead of typing. Today those
 * are dead ends. This transcribes an inbound voice note to text via an injected speech-to-text
 * function (run local Whisper on PC #2 — zero cost, on-prem), then feeds the transcript into the
 * SAME message router so a voice note is handled exactly like a typed message (AI reply, intent,
 * workflow, everything).
 *
 * Decoupled: the STT call and the downstream handler are injected. Transcripts are cached by audio
 * id so re-delivery doesn't re-transcribe.
 *
 * Storage: JSON cache (data/voice_transcripts.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'voice_transcripts.json');

let sttFn = null;     // async ({ url|path|buffer, language? }) => string (transcript)
let handler = null;   // async ({ phone, text, name }) => { reply? }   (message router)
function setSTT(fn) { sttFn = typeof fn === 'function' ? fn : null; }
function setHandler(fn) { handler = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { transcripts: {} }; }
  catch { return { transcripts: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

/**
 * Transcribe a voice note (cached by audioId).
 * @param {Object} audio { audioId, url?, path?, buffer?, language? }
 * @returns {Promise<{ transcript, cached }>}
 */
async function transcribe(audio = {}) {
  if (!sttFn) throw new Error('no STT engine wired (call setSTT)');
  const id = audio.audioId || audio.url || audio.path;
  if (!id) throw new Error('audio id/url/path required');
  const data = load();
  if (data.transcripts[id]) return { transcript: data.transcripts[id].text, cached: true };

  const text = String(await sttFn({ url: audio.url, path: audio.path, buffer: audio.buffer, language: audio.language || 'ur' }) || '').trim();
  data.transcripts[id] = { text, at: nowIso() };
  save(data);
  return { transcript: text, cached: false };
}

/**
 * Full pipeline: transcribe an inbound voice note, then route the transcript as a normal message.
 * @param {Object} msg { phone, name?, audioId, url?, path?, language? }
 * @returns {Promise<{ transcript, reply?, routed }>}
 */
async function handleVoiceNote(msg = {}) {
  if (!msg.phone) throw new Error('phone required');
  const { transcript } = await transcribe(msg);
  if (!transcript) return { transcript: '', routed: false };
  let reply = null, routed = false;
  if (handler) {
    try {
      const out = await handler({ phone: msg.phone, name: msg.name, text: transcript, via: 'voice' });
      reply = out && out.reply ? out.reply : null;
      routed = true;
    } catch { routed = false; }
  }
  return { transcript, reply, routed };
}

function getTranscript(audioId) {
  const t = load().transcripts[audioId];
  return t ? t.text : null;
}

module.exports = { setSTT, setHandler, transcribe, handleVoiceNote, getTranscript };
