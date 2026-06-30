// lib/scheduledReports/config.js — Safe config for the Scheduled Reports & Exports department.
// JSON-backed like the rest of the app. Reports are BUILT + ARCHIVED always; external delivery is
// DRAFT-ONLY until a notifier is wired AND live delivery is enabled. Never stores secrets.

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
 enabled: bool(process.env.SCHEDULED_REPORTS_ENABLED, true),
 // External delivery of built reports (owner email/WhatsApp). Off by default = draft.
 liveDelivery: bool(process.env.SCHEDULED_REPORTS_LIVE_DELIVERY, false),
 // How many run snapshots to retain per report.
 maxRunsPerReport: num(process.env.SCHEDULED_REPORTS_MAX_RUNS, 50),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.SCHEDULED_REPORTS_STORE_PATH, 'data/scheduled-reports.json'),
 },
};

config.effective = { liveDelivery: config.enabled && config.liveDelivery };

// Report sources this dept knows how to build from (best-effort; missing depts degrade to null).
const SOURCES = ['analytics', 'billing', 'support', 'drip', 'links', 'sender_health', 'consent'];
const FORMATS = ['json', 'csv'];

module.exports = { config, bool, num, ROOT, DATA_DIR, SOURCES, FORMATS };
