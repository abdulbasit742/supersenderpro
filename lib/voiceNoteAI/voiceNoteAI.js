// lib/voiceNoteAI/voiceNoteAI.js
// ────────────────────────────────────────────────────────────────────
// WhatsApp voice-note AI pipeline. Customers send voice notes; this transcribes
// them on a self-hosted Whisper box, then (optionally) routes the transcript
// through the conversational support agent (which runs on local Ollama) to
// produce a reply, intent and escalation decision. All on your own GPUs.
//
// transcribe-only mode works even without the support agent present. Both the
// transcription and reply steps degrade gracefully so the API never hard-fails.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const whisper = require('./whisperClient');

// Optional: the conversational support agent (feature #1). Voice notes get the
// same brain as text once a transcript exists. Loaded best-effort.
let supportAgent = null;
try { supportAgent = require('../../ai/agents/supportAgent'); } catch { /* optional */ }

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'voice_notes');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const jobsFile = path.join(DATA_DIR, '_jobs.json');

function readJobs() {
  try { return fs.existsSync(jobsFile) ? JSON.parse(fs.readFileSync(jobsFile, 'utf8')) : []; }
  catch { return []; }
}
function writeJobs(jobs) {
  try { fs.writeFileSync(jobsFile, JSON.stringify(jobs.slice(-500), null, 2)); }
  catch (e) { console.error('[voiceNoteAI] jobs write failed:', e.message); }
}
function logJob(job) { const j = readJobs(); j.push(job); writeJobs(j); return job; }

/**
 * Transcribe a voice note only.
 * @param {Buffer} buffer @param {object} opts { filename?, language? }
 * @returns {Promise<{ text, language, source }>}
 */
async function transcribe(buffer, opts = {}) {
  try {
    const { text, language, raw } = await whisper.transcribeBuffer(buffer, opts);
    return { text, language, source: 'whisper', raw };
  } catch (err) {
    console.warn('[voiceNoteAI] transcription failed:', err.message);
    return { text: '', language: 'und', source: 'fallback', error: err.message };
  }
}

/**
 * Full handle: transcribe + (optional) generate a reply via the support agent.
 * @param {object} args
 * @param {Buffer} args.buffer - voice note audio
 * @param {string} args.phone
 * @param {string} [args.storeId='default_store']
 * @param {string} [args.filename='voice.ogg']
 * @param {string} [args.language]
 * @param {boolean} [args.reply=true] - run the support agent on the transcript
 * @returns {Promise<object>} { id, transcript, language, reply?, intent?, shouldEscalate?, ... }
 */
async function handleVoiceNote({ buffer, phone, storeId = 'default_store', filename = 'voice.ogg', language, reply = true } = {}) {
  if (!buffer || !buffer.length) throw new Error('audio buffer is required');
  if (!phone) throw new Error('phone is required');

  const id = crypto.randomUUID().slice(0, 12);
  const t = await transcribe(buffer, { filename, language });
  const base = { id, storeId, phone, transcript: t.text, language: t.language, transcriptSource: t.source, ts: Date.now() };

  // Couldn't understand the audio -> ask for a text message, flag for human.
  if (!t.text) {
    const job = logJob({ ...base, status: 'transcription_failed', reply: 'Sorry, I could not understand that voice note. Could you please type your message?', shouldEscalate: true, escalationReason: 'Voice transcription failed' });
    return job;
  }

  if (!reply || !supportAgent || typeof supportAgent.handleMessage !== 'function') {
    return logJob({ ...base, status: 'transcribed' });
  }

  try {
    const agentResult = await supportAgent.handleMessage({ storeId, phone, message: t.text });
    return logJob({
      ...base,
      status: 'answered',
      reply: agentResult.reply,
      intent: agentResult.intent,
      sentiment: agentResult.sentiment,
      shouldEscalate: agentResult.shouldEscalate,
      escalationReason: agentResult.escalationReason,
      order: agentResult.order || null,
      replySource: agentResult.source
    });
  } catch (err) {
    console.warn('[voiceNoteAI] agent reply failed:', err.message);
    return logJob({ ...base, status: 'transcribed_no_reply', reply: 'Thanks for your voice note! Let me connect you with our team.', shouldEscalate: true, escalationReason: 'Agent reply error', error: err.message });
  }
}

function listJobs({ storeId, phone, limit = 50 } = {}) {
  let jobs = readJobs().slice().reverse();
  if (storeId) jobs = jobs.filter(j => j.storeId === storeId);
  if (phone) jobs = jobs.filter(j => j.phone === phone);
  return jobs.slice(0, limit);
}
function getJob(id) { return readJobs().find(j => j.id === id) || null; }

async function health() {
  const reachable = await whisper.ping();
  return {
    ok: true,
    whisperHost: whisper.HOST(),
    whisperModel: whisper.MODEL(),
    whisperReachable: reachable,
    supportAgentWired: Boolean(supportAgent && supportAgent.handleMessage),
    totalJobs: readJobs().length
  };
}

module.exports = { transcribe, handleVoiceNote, listJobs, getJob, health };
