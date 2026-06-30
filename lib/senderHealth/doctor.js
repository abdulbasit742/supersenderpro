// lib/senderHealth/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const spintax = require('./spintax');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', d.numbers && typeof d.numbers === 'object');
 ok('caps_sane', config.warmupStartCap > 0 && config.dailyCapMax >= config.warmupStartCap && config.hourlyCap > 0);
 ok('delay_window_sane', config.maxDelayMs >= config.minDelayMs && config.minDelayMs >= 0);
 ok('spintax_ok', spintax.count('{a|b|c}') === 3, 'spintax counts variations');
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 warmup: `${config.warmupStartCap} +${config.warmupGrowthPerDay}/day up to ${config.dailyCapMax}`,
 hourlyCap: config.hourlyCap,
 delayMs: `${config.minDelayMs}-${config.maxDelayMs}`,
 denyBelowScore: config.denyBelowScore,
 },
 counts: { numbers: Object.keys(d.numbers).length },
 checks,
 };
}

module.exports = { run };
