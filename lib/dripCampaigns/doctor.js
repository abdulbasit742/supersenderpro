// lib/dripCampaigns/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.journeys) && Array.isArray(d.enrollments));
 ok('draft_safe_default', config.effective.liveSends === false || config.liveSends === true,
 config.effective.liveSends ? 'live sends explicitly enabled' : 'draft-only (safe)');
 ok('quiet_hours_valid', config.quietStartHour >= 0 && config.quietStartHour <= 23 && config.quietEndHour >= 0 && config.quietEndHour <= 23);
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 liveSends: config.effective.liveSends,
 maxStepsPerContactPerDay: config.maxStepsPerContactPerDay,
 quietHours: `${config.quietStartHour}:00-${config.quietEndHour}:00`,
 },
 counts: { journeys: d.journeys.length, enrollments: d.enrollments.length, sends: d.sends.length },
 checks,
 };
}

module.exports = { run };
