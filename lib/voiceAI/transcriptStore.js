// lib/voiceAI/transcriptStore.js — Stores transcripts ONLY when storage + consent allow.
// Otherwise it stores nothing and returns {stored:false}.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');
const { redactText, preview } = require('./redaction');
const consentGuard = require('./consentGuard');

function save(subjectId, transcript, meta = {}) {
  const decision = consentGuard.canStoreTranscript(subjectId);
  if (!decision.allowed) {
    return { stored: false, reason: decision.reason, preview: preview(transcript) };
  }
  const data = readJSON(config.paths.transcripts, { items: [] });
  data.items = Array.isArray(data.items) ? data.items : [];
  const entry = {
    id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subjectId,
    at: new Date().toISOString(),
    text: redactText(transcript),       // redacted even when stored
    language: meta.language || null,
    intent: meta.intent || null,
  };
  data.items.push(entry);
  writeJSON(config.paths.transcripts, data);
  return { stored: true, id: entry.id };
}

module.exports = { save };
