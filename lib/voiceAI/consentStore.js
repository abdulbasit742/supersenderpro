// lib/voiceAI/consentStore.js — Stores per-subject voice consent records.
// Consent is OFF by default for external providers and voice cloning.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');

function defaults(subjectId, subjectType = 'customer') {
  return {
    subjectId,
    subjectType,
    voiceMessagesOptIn: false,
    transcriptionOptIn: false,
    externalProviderOptIn: false,
    voiceCloneOptIn: false, // always false by default
    preferredLanguage: config.defaultLanguage,
    preferredVoice: null,
    updatedAt: null,
    source: 'default',
    notes: '',
  };
}

function _load() { return readJSON(config.paths.consent, { records: {} }); }
function _save(d) { return writeJSON(config.paths.consent, d); }

function get(subjectId, subjectType = 'customer') {
  const d = _load();
  return (d.records && d.records[subjectId]) || defaults(subjectId, subjectType);
}

function set(subjectId, patch = {}, source = 'api') {
  const d = _load();
  d.records = d.records || {};
  const cur = d.records[subjectId] || defaults(subjectId, patch.subjectType);
  const next = { ...cur, ...patch };
  // Hard guard: voice clone consent can only be true if explicitly passed true.
  next.voiceCloneOptIn = patch.voiceCloneOptIn === true;
  next.updatedAt = new Date().toISOString();
  next.source = source;
  d.records[subjectId] = next;
  _save(d);
  return next;
}

function optOut(subjectId, source = 'api') {
  return set(subjectId, {
    voiceMessagesOptIn: false,
    transcriptionOptIn: false,
    externalProviderOptIn: false,
    voiceCloneOptIn: false,
    notes: 'opted_out',
  }, source);
}

module.exports = { get, set, optOut, defaults };
