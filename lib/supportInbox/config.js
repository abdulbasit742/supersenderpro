// lib/supportInbox/config.js — Safe config for the Customer Support Inbox department.
// JSON-backed like the rest of the app. Outbound replies are DRAFT-ONLY by default
// (nothing is sent until a notifier is wired AND live replies are enabled). Never stores secrets.

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
 enabled: bool(process.env.SUPPORT_INBOX_ENABLED, true),
 // Draft-only outbound by default: replies are previewed, never auto-sent.
 liveReplies: bool(process.env.SUPPORT_INBOX_LIVE_REPLIES, false),
 // SLA targets in minutes.
 firstResponseSlaMins: num(process.env.SUPPORT_INBOX_FIRST_RESPONSE_SLA_MINS, 60),
 resolutionSlaMins: num(process.env.SUPPORT_INBOX_RESOLUTION_SLA_MINS, 1440),
 defaultPriority: process.env.SUPPORT_INBOX_DEFAULT_PRIORITY || 'normal',
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.SUPPORT_INBOX_STORE_PATH, 'data/support-inbox.json'),
 },
};

config.effective = {
 liveReplies: config.enabled && config.liveReplies,
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
