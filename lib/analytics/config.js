// lib/analytics/config.js — Safe config for the Analytics & Reporting department.
// JSON-backed like the rest of the app. Stores aggregate events (counts/metrics) only — never
// message bodies or PII. Digest delivery is DRAFT-ONLY until a notifier is wired. Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.ANALYTICS_ENABLED, true),
 // Digest reports are draft-only by default (computed + recorded, not auto-sent).
 liveDigests: bool(process.env.ANALYTICS_LIVE_DIGESTS, false),
 // Cap stored raw events; rollups are kept regardless. Oldest raw events trimmed past this.
 maxEvents: num(process.env.ANALYTICS_MAX_EVENTS, 50000),
 // Retention for raw events in days (rollups are permanent).
 rawRetentionDays: num(process.env.ANALYTICS_RAW_RETENTION_DAYS, 90),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.ANALYTICS_STORE_PATH, 'data/analytics.json'),
 },
};

config.effective = { liveDigests: config.enabled && config.liveDigests };

module.exports = { config, bool, num, ROOT, DATA_DIR };
