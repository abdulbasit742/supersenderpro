// lib/customer360/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, EVENT_WEIGHTS } = require('./config');
const store = require('./store');
const engagement = require('./engagement');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', d.timelines && typeof d.timelines === 'object');
 // recent activity scores higher than the same activity long ago
 const now = Date.now();
 const recent = engagement.score([{ type: 'payment', at: new Date(now).toISOString() }], now).score;
 const old = engagement.score([{ type: 'payment', at: new Date(now - 120 * 864e5).toISOString() }], now).score;
 ok('recency_decay', recent > old, 'recent activity scores higher than stale activity');
 const optOut = engagement.score([{ type: 'payment', at: new Date(now).toISOString() }, { type: 'opt_out', at: new Date(now).toISOString() }], now).score;
 ok('optout_caps_score', optOut <= 5, 'an opt-out caps engagement low');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, maxEventsPerContact: config.maxEventsPerContact, recencyHalfLifeDays: config.recencyHalfLifeDays, weightedTypes: Object.keys(EVENT_WEIGHTS).length },
 counts: { contactsTracked: Object.keys(d.timelines).length },
 checks,
 };
}

module.exports = { run };
