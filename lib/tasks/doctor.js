// lib/tasks/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, STATUSES, PRIORITIES } = require('./config');
const store = require('./store');

function _present(name) { try { require('../' + name); return true; } catch (_e) { return false; } }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.tasks) && typeof d.remindersFired === 'object');
 ok('reminders_safe_default', config.effective.liveReminders === false || config.liveReminders === true, config.effective.liveReminders ? 'live reminders enabled' : 'draft-only (safe)');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, liveReminders: config.effective.liveReminders, dueSoonHours: config.dueSoonHours, fanOverdue: config.fanOverdue, statuses: STATUSES, priorities: PRIORITIES, alertsWired: _present('alertCenter'), automationWired: _present('automationRules') },
 counts: { tasks: d.tasks.length, open: d.tasks.filter((t) => ['open', 'in_progress'].includes(t.status)).length },
 checks,
 };
}

module.exports = { run };
