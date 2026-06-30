// lib/messageScheduler/config.js — Safe config for the Message Scheduler department.
// JSON-backed like the rest of the app. Outbound is DRAFT-ONLY by default: the runner computes
// what WOULD be sent and records it, but nothing is sent until a notifier is wired AND live sends
// are enabled. Never stores secrets.

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
 enabled: bool(process.env.MESSAGE_SCHEDULER_ENABLED, true),
 liveSends: bool(process.env.MESSAGE_SCHEDULER_LIVE_SENDS, false),
 // Default IANA timezone for jobs that don't specify one.
 defaultTimezone: process.env.MESSAGE_SCHEDULER_DEFAULT_TZ || 'Asia/Karachi',
 // Quiet hours (local 24h to the job's timezone). Due jobs inside the window defer to window end.
 quietStartHour: num(process.env.MESSAGE_SCHEDULER_QUIET_START_HOUR, 22),
 quietEndHour: num(process.env.MESSAGE_SCHEDULER_QUIET_END_HOUR, 8),
 maxRetries: num(process.env.MESSAGE_SCHEDULER_MAX_RETRIES, 3),
 retryBackoffMinutes: num(process.env.MESSAGE_SCHEDULER_RETRY_BACKOFF_MINUTES, 10),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.MESSAGE_SCHEDULER_STORE_PATH, 'data/message-scheduler.json'),
 },
};

config.effective = { liveSends: config.enabled && config.liveSends };

module.exports = { config, bool, num, ROOT, DATA_DIR };
