// lib/voiceReply/voiceReply.js
// ────────────────────────────────────────────────────────────────────
// AI Voice Replies. The flip side of voice-note transcription (#7): instead of
// only READING voice notes, the bot can ANSWER with one. Turns a text reply into
// a spoken WhatsApp voice note using a self-hosted TTS server — warmer, more
// human, and great for customers who prefer listening (or can\'t read easily).
//
// Language-aware voice selection, a length guard (very long replies stay text),
// audio saved to data/voice_replies/, file-backed job log, and a graceful text
// fallback when TTS is unavailable so nothing ever breaks. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tts = require('./ttsClient');

const MAX_TTS_CHARS = () => parseInt(process.env.VOICE_REPLY_MAX_CHARS || '600', 10);

const OUT_DIR = path.join(__dirname, '..', '..', 'data', 'voice_replies');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const jobsFile = path.join(OUT_DIR, '_jobs.json');

function readJobs() { try { return fs.existsSync(jobsFile) ? JSON.parse(fs.readFileSync(jobsFile, 'utf8')) : []; } catch { return []; } }
function writeJobs(j) { try { fs.writeFileSync(jobsFile, JSON.stringify(j.slice(-500), null, 2)); } catch (e) { console.error('[voiceReply] jobs write failed:', e.message); } }
function logJob(job) { const j = readJobs(); j.push(job); writeJobs(j); return job; }

// language -> a sensible default voice (override via VOICE_REPLY_VOICE_MAP JSON or per-call)
function voiceForLanguage(language) {
  let map = {};
  try { map = process.env.VOICE_REPLY_VOICE_MAP ? JSON.parse(process.env.VOICE_REPLY_VOICE_MAP) : {}; } catch { map = {}; }
  const defaults = { en: 'alloy', ur: 'nova', 'roman-ur': 'nova', hi: 'shimmer', ar: 'onyx' };
  return map[language] || defaults[language] || tts.DEFAULT_VOICE();
}

// crude language guess so we can pick a voice without a hard dependency
function guessLanguage(text = '') {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/\b(hai|nahi|kya|kaise|chahiye|kitne|bhai)\b/i.test(text)) return 'roman-ur';
  return 'en';
}

/**
 * Synthesize a voice note from text.
 * @returns {Promise<{ id, mode:'voice'|'text', file?, url?, mime?, text, voice?, source }>}
 */
async function speak({ storeId = 'default_store', phone, text, language, voice, force = false } = {}) {
  if (!text || !String(text).trim()) throw new Error('text is required');
  const id = crypto.randomUUID().slice(0, 12);
  const lang = language || guessLanguage(text);

  // length guard: long replies are better read than heard
  if (!force && String(text).length > MAX_TTS_CHARS()) {
    const job = logJob({ id, storeId, phone: phone || null, mode: 'text', reason: 'too_long', chars: text.length, text, ts: Date.now() });
    return { ...job };
  }

  try {
    const chosenVoice = voice || voiceForLanguage(lang);
    const { bytes, format } = await tts.synthesize(text, { voice: chosenVoice });
    const outName = `${id}.${format === 'opus' ? 'ogg' : format}`;
    fs.writeFileSync(path.join(OUT_DIR, outName), bytes);
    const job = logJob({ id, storeId, phone: phone || null, mode: 'voice', file: outName, mime: format === 'opus' ? 'audio/ogg' : `audio/${format}`, voice: chosenVoice, language: lang, text, source: 'tts', ts: Date.now() });
    return { ...job, url: `/api/voice-reply/file/${outName}` };
  } catch (err) {
    console.warn('[voiceReply] TTS failed, falling back to text:', err.message);
    const job = logJob({ id, storeId, phone: phone || null, mode: 'text', reason: 'tts_unavailable', error: err.message, text, ts: Date.now() });
    return { ...job };
  }
}

function listJobs({ storeId, phone, limit = 50 } = {}) {
  let jobs = readJobs().slice().reverse();
  if (storeId) jobs = jobs.filter(j => j.storeId === storeId);
  if (phone) jobs = jobs.filter(j => j.phone === phone);
  return jobs.slice(0, limit);
}

function filePath(name) {
  const safe = path.basename(String(name));
  const p = path.join(OUT_DIR, safe);
  return fs.existsSync(p) ? p : null;
}

async function health() {
  const reachable = await tts.ping();
  return { ok: true, ttsHost: tts.HOST(), ttsModel: tts.MODEL(), ttsReachable: reachable, format: tts.FORMAT(), maxChars: MAX_TTS_CHARS() };
}

module.exports = { speak, listJobs, filePath, health, _internal: { guessLanguage, voiceForLanguage } };
