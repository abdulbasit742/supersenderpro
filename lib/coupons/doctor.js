// lib/coupons/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, TYPES } = require('./config');
const store = require('./store');
const validator = require('./validator');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.coupons) && Array.isArray(d.redemptions));
 // percent discount math
 const disc = validator._computeDiscount({ type: 'percent', value: 20 }, 1000);
 ok('percent_math', disc === 200, '20% of 1000 = 200');
 const fixed = validator._computeDiscount({ type: 'fixed', value: 5000 }, 1200);
 ok('fixed_caps_at_amount', fixed === 1200, 'fixed discount never exceeds the order amount');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, defaultCurrency: config.defaultCurrency, types: TYPES, codeLength: config.codeLength },
 counts: { coupons: d.coupons.length, active: d.coupons.filter((c) => c.active !== false).length, redemptions: d.redemptions.length },
 checks,
 };
}

module.exports = { run };
