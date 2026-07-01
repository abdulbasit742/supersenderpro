'use strict';
// SLA Monitor config. All values overridable via env; safe defaults baked in.
// Times are in MINUTES unless noted. Deterministic core; no external deps.

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }

const config = {
  dataDir: process.env.SLA_DATA_DIR || 'data/slaMonitor',

  // First response = time from inbound customer msg to first human/bot reply.
  firstResponseTargetMin: num(process.env.SLA_FIRST_RESPONSE_MIN, 15),
  // Resolution = time from conversation open to marked resolved.
  resolutionTargetMin: num(process.env.SLA_RESOLUTION_MIN, 240),
  // Warn threshold: fraction of target at which we flag 'at risk' (0..1).
  warnFraction: num(process.env.SLA_WARN_FRACTION, 0.8),

  // Business hours (24h clock, local). Outside these, clock is paused.
  businessStartHour: num(process.env.SLA_BIZ_START, 9),
  businessEndHour: num(process.env.SLA_BIZ_END, 21),
  // If true, only count time inside business hours toward SLA.
  pauseOutsideBusinessHours: process.env.SLA_PAUSE_OFF_HOURS !== 'false',

  // Admin guard for write endpoints.
  adminToken: process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET || '',

  // Ollama is optional; deterministic core never needs it.
  ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
  model: process.env.OLLAMA_MODEL || 'qwen2.5:32b'
};

module.exports = { config };
