// lib/inboundWebhooks/config.js — Safe config for the Inbound Webhook Ingestion department.
// JSON-backed like the rest of the app. This is an INGESTION boundary: it verifies + normalizes
// incoming third-party webhooks and hands a clean internal event to automation #48 / alerts #28.
// It performs no sends. Signature verification is ON by default (a source without a secret is
// rejected unless explicitly marked unsigned). Never stores secrets in plaintext views.

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
 enabled: bool(process.env.INBOUND_WEBHOOKS_ENABLED, true),
 // When true, fan normalized events into the automation engine (#48) if present.
 fanToAutomation: bool(process.env.INBOUND_WEBHOOKS_FAN_AUTOMATION, true),
 // When true, also emit into the alert center (#28) if present.
 fanToAlerts: bool(process.env.INBOUND_WEBHOOKS_FAN_ALERTS, false),
 // Max raw events retained for inspection/replay (oldest trimmed). Bodies are NOT stored.
 maxEventLog: num(process.env.INBOUND_WEBHOOKS_MAX_EVENT_LOG, 5000),
 // Dedupe window (minutes) for redelivered events keyed by source + external id.
 dedupeWindowMinutes: num(process.env.INBOUND_WEBHOOKS_DEDUPE_WINDOW_MINUTES, 1440),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.INBOUND_WEBHOOKS_STORE_PATH, 'data/inbound-webhooks.json'),
 },
};

const SIG_SCHEMES = ['hmac_sha256', 'token', 'unsigned'];

module.exports = { config, bool, num, ROOT, DATA_DIR, SIG_SCHEMES };
