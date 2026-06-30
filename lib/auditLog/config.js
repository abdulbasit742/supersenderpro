// lib/auditLog/config.js — Safe config for the Audit Log department. JSON-backed like the rest
// of the app. Records are append-only and hash-chained (tamper-evident). Sensitive values are
// redacted at ingest. Never stores secrets.

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
 enabled: bool(process.env.AUDIT_LOG_ENABLED, true),
 // Retain at most this many records (oldest trimmed). Chain re-anchors on trim (see store).
 maxRecords: num(process.env.AUDIT_LOG_MAX_RECORDS, 100000),
 // Auto-log only mutating HTTP methods by default (POST/PUT/PATCH/DELETE).
 logReadsToo: bool(process.env.AUDIT_LOG_LOG_READS, false),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.AUDIT_LOG_STORE_PATH, 'data/audit-log.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
