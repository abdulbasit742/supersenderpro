// lib/experiments/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const assignment = require('./assignment');
const stats = require('./stats');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.experiments) && typeof d.assignments === 'object');
 // sticky assignment: same input -> same output
 const a = assignment.pick('exp-x', '+923001234567', [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }]);
 const b = assignment.pick('exp-x', '+923001234567', [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }]);
 ok('assignment_sticky', a === b, 'same contact maps to the same variant');
 const z = stats.zTest(50, 1000, 30, 1000);
 ok('stats_ok', typeof z.z === 'number', 'z-test computes');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, minSamplePerVariant: config.minSamplePerVariant, significanceZ: config.significanceZ },
 counts: { experiments: d.experiments.length },
 checks,
 };
}

module.exports = { run };
