'use strict';
/**
 * voiceAI.js — Voice Feature #1: understand inbound WhatsApp voice notes.
 *
 * Lots of customers (especially Urdu-speaking) send voice notes instead of typing. Without this they
 * fall into a black hole. This transcribes a voice note to text via an injected speech-to-text hook
 * (run local Whisper on PC #2 — zero cloud cost, on-prem), then feeds the transcript into the same
 * inbound pipeline (#inbound1) as if the customer had typed it. The AI support agent answers, the
 * CRM records it, workflows fire — all automatically.
 *
 * Decoupled: STT + the downstream handler are injected. Storage: JSON (data/voice_transcripts.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'voice_transcripts.json');

let sttHook = null;       // async (audioRef, { lang? }) => string transcript   (local Whisper)
let inboundHandler = null; // async ({ phone, text, name }) => { reply? }          (message router)
let langDetect = null;     // (text) => 'en'|'ur'|'roman-ur'                        (i18n.detectLang)
function setSTT(fn) { sttHook = typeof fn === 'function' ? fn : null; }
function setInboundHandler(fn) { inboundHandler = typeof fn === 'function' ? fn : null; }
function setLangDetect(fn) { langDetect = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { transcripts: [] }; }
  catch { return { transcripts: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function log(entry) {
  const data = load();
  data.transcripts.unshift({ id: `VOX-${Date.now()}`, ...entry, at: nowIso() });
  if (data.transcripts.length > 2000) data.transcripts = data.transcripts.slice(0, 2000);
  save(data);
}

/**
 * Handle an inbound voice note.
 * @param {Object} msg { phone, audioRef (url/path), name?, lang? }
 * @returns {Promise<Object>} { transcript, lang, routed, reply? }
 */
async function handleVoiceNote(msg = {}) {
  const phone = normPhone(msg.phone);
  if (!phone) throw new Error('phone required');
  if (!msg.audioRef) throw new Error('audioRef (url or path) required');
  if (!sttHook) throw new Error('no speech-to-text hook wired (setSTT)');

  let transcript = '';
  try { transcript = String(await sttHook(msg.audioRef, { lang: msg.lang }) || '').trim(); }
  catch (e) { log({ phone, error: `stt failed: ${e.message}` }); throw new Error(`transcription failed: ${e.message}`); }

  const lang = langDetect ? langDetect(transcript) : (msg.lang || 'en');
  log({ phone, transcript, lang });

  let reply = null, routed = false;
  if (transcript && inboundHandler) {
    try {
      const out = await inboundHandler({ phone, text: transcript, name: msg.name });
      reply = out && out.reply ? out.reply : null;
      routed = true;
    } catch { /* keep transcript even if routing fails */ }
  }
  return { transcript, lang, routed, reply };
}

function recentTranscripts(limit = 50) {
  return load().transcripts.slice(0, Math.max(1, Number(limit) || 50));
}

module.exports = { setSTT, setInboundHandler, setLangDetect, handleVoiceNote, recentTranscripts };
