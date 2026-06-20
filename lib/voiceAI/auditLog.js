// lib/voiceAI/auditLog.js — Append-only, privacy-safe audit log for voice events.
// All payloads are redacted before storage. Never stores raw audio or full PII.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');
const { redactText } = require('./redaction');

const MAX_EVENTS = 5000;

function safeMeta(meta) {
  const out = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (typeof v === 'string') out[k] = redactText(v).slice(0, 240);
    else if (v === null || ['number', 'boolean'].includes(typeof v)) out[k] = v;
    else out[k] = '[object]';
  }
  return out;
}

function record(event, meta = {}) {
  const entry = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    event,
    at: new Date().toISOString(),
    dryRun: config.dryRun,
    meta: safeMeta(meta),
  };
  const log = readJSON(config.paths.audit, { events: [] });
  log.events = Array.isArray(log.events) ? log.events : [];
  log.events.push(entry);
  if (log.events.length > MAX_EVENTS) log.events = log.events.slice(-MAX_EVENTS);
  writeJSON(config.paths.audit, log);
  return entry;
}

function list({ limit = 100, event = null } = {}) {
  const log = readJSON(config.paths.audit, { events: [] });
  let events = Array.isArray(log.events) ? log.events : [];
  if (event) events = events.filter((e) => e.event === event);
  return events.slice(-limit).reverse();
}

module.exports = { record, list };
