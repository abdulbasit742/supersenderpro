// lib/tasks/config.js — Safe config for the Tasks & Follow-ups department.
// JSON-backed like the rest of the app. Tasks are internal to-dos for the team; this module never
// sends to customers. Reminder dispatch is DRAFT-ONLY until a notifier is wired AND live reminders
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
 enabled: bool(process.env.TASKS_ENABLED, true),
 // Live reminder dispatch to the assignee (owner/agent). Off by default = draft.
 liveReminders: bool(process.env.TASKS_LIVE_REMINDERS, false),
 // A task is "due soon" within this many hours of its due date.
 dueSoonHours: num(process.env.TASKS_DUE_SOON_HOURS, 24),
 // When true, firing an overdue task emits 'task.overdue' into alerts #28 / automation #48.
 fanOverdue: bool(process.env.TASKS_FAN_OVERDUE, true),
 maxTasks: num(process.env.TASKS_MAX, 50000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.TASKS_STORE_PATH, 'data/tasks.json'),
 },
};

config.effective = { liveReminders: config.enabled && config.liveReminders };

const STATUSES = ['open', 'in_progress', 'done', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

module.exports = { config, bool, num, ROOT, DATA_DIR, STATUSES, PRIORITIES };
