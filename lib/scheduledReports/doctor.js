// lib/scheduledReports/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, SOURCES } = require('./config');
const store = require('./store');
const sources = require('./sources');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.reports) && Array.isArray(d.runs));
 ok('delivery_safe_default', config.effective.liveDelivery === false || config.liveDelivery === true,
 config.effective.liveDelivery ? 'live delivery enabled' : 'draft-only (safe)');
 // Which sources are actually wired right now (non-fatal probe).
 const present = SOURCES.filter((s) => sources.collect(s) !== null);
 ok('at_least_one_source', true, present.length ? 'available: ' + present.join(', ') : 'no source depts present yet (reports still build, just empty)');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, liveDelivery: config.effective.liveDelivery, knownSources: SOURCES, availableSources: present },
 counts: { reports: d.reports.length, runs: d.runs.length },
 checks,
 };
}

module.exports = { run };
