// lib/messageScheduler/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const cron = require('./cron');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.jobs) && Array.isArray(d.runs));
 ok('send_safe_default', config.effective.liveSends === false || config.liveSends === true,
 config.effective.liveSends ? 'live sends explicitly enabled' : 'draft-only (safe)');
 ok('cron_parser_ok', cron.isValid('*/5 * * * *') && !cron.isValid('bad cron'));
 ok('quiet_hours_valid', config.quietStartHour >= 0 && config.quietStartHour <= 23 && config.quietEndHour >= 0 && config.quietEndHour <= 23);
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 liveSends: config.effective.liveSends,
 defaultTimezone: config.defaultTimezone,
 quietHours: `${config.quietStartHour}:00-${config.quietEndHour}:00`,
 maxRetries: config.maxRetries,
 },
 counts: { jobs: d.jobs.length, runs: d.runs.length },
 checks,
 };
}

module.exports = { run };
