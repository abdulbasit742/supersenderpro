// lib/alertCenter/config.js — Safe config for the Notifications & Alerts department.
// JSON-backed like the rest of the app. The in-app feed always records matched alerts; the
// EXTERNAL owner notifier is DRAFT-ONLY until a notifier is wired AND live delivery is enabled.
// Never stores secrets.

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
 enabled: bool(process.env.ALERT_CENTER_ENABLED, true),
 // External delivery (owner WhatsApp/email). Off by default = draft (recorded, not sent).
 liveDelivery: bool(process.env.ALERT_CENTER_LIVE_DELIVERY, false),
 // Default throttle window (minutes) per rule to avoid alert storms.
 defaultThrottleMinutes: num(process.env.ALERT_CENTER_DEFAULT_THROTTLE_MINUTES, 15),
 // Cap stored alerts in the feed (oldest trimmed).
 maxFeed: num(process.env.ALERT_CENTER_MAX_FEED, 5000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.ALERT_CENTER_STORE_PATH, 'data/alert-center.json'),
 },
};

config.effective = { liveDelivery: config.enabled && config.liveDelivery };

// Known severities (ordered).
const SEVERITIES = ['info', 'warning', 'critical'];

module.exports = { config, bool, num, ROOT, DATA_DIR, SEVERITIES };
