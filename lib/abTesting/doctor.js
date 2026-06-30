// lib/abTesting/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const assign = require('./assign');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.experiments));
 // Deterministic assignment: same input -> same output.
 const vars = [{ id: 'a', weight: 1 }, { id: 'b', weight: 1 }];
 const a1 = assign.pickVariant('exp-x', '+923001234567', vars);
 const a2 = assign.pickVariant('exp-x', '+923001234567', vars);
 ok('assignment_deterministic', a1 === a2, `stable assignment (${a1})`);
 ok('thresholds_sane', config.minSamplePerVariant > 0 && config.minRateGapPct >= 0);
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, minSamplePerVariant: config.minSamplePerVariant, minRateGapPct: config.minRateGapPct },
 counts: { experiments: d.experiments.length },
 checks,
 };
}

module.exports = { run };
