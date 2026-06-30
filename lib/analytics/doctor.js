// lib/analytics/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.events) && Array.isArray(d.digests));
 ok('digest_safe_default', config.effective.liveDigests === false || config.liveDigests === true,
 config.effective.liveDigests ? 'live digests explicitly enabled' : 'draft-only (safe)');
 ok('retention_valid', config.rawRetentionDays > 0 && config.maxEvents > 0);
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 liveDigests: config.effective.liveDigests,
 maxEvents: config.maxEvents,
 rawRetentionDays: config.rawRetentionDays,
 },
 counts: { events: d.events.length, digests: d.digests.length },
 checks,
 };
}

module.exports = { run };
