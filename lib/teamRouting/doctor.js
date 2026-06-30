// lib/teamRouting/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, STRATEGIES } = require('./config');
const store = require('./store');
const strategies = require('./strategies');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.agents) && typeof d.assignments === 'object');
 ok('strategy_valid', STRATEGIES.includes(config.defaultStrategy), 'default strategy: ' + config.defaultStrategy);
 // least-load picks the lower-utilization agent
 const pick = strategies.leastLoad([{ id: 'a', load: 5, capacity: 10 }, { id: 'b', load: 1, capacity: 10 }]);
 ok('least_load_ok', pick && pick.id === 'b', 'least-load selects lower utilization');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, defaultStrategy: config.defaultStrategy, defaultCapacity: config.defaultCapacity, requireOnline: config.requireOnline, queueWhenFull: config.queueWhenFull },
 counts: { agents: d.agents.length, openAssignments: Object.keys(d.assignments).length, queued: d.queue.length },
 checks,
 };
}

module.exports = { run };
