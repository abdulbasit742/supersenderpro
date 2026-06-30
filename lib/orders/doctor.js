// lib/orders/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, STATUSES, TRANSITIONS } = require('./config');
const store = require('./store');
const totals = require('./totals');

function _present(name) { try { require('../' + name); return true; } catch (_e) { return false; } }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.orders));
 ok('messages_safe_default', config.liveMessages === false, config.liveMessages ? 'live messages ON' : 'draft-only (safe)');
 // totals math
 const t = totals.compute({ items: [{ name: 'A', qty: 2, unitPrice: 100 }, { name: 'B', qty: 1, unitPrice: 50 }], taxPercent: 10, shippingFlat: 20 });
 ok('totals_math', t.subtotal === 250 && t.tax === 25 && t.total === 295, 'subtotal 250 + 10% tax + 20 shipping = 295');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, currency: config.defaultCurrency, liveMessages: config.liveMessages, taxPercent: config.taxPercent, shippingFlat: config.shippingFlat, statuses: STATUSES, couponsWired: _present('coupons'), customer360Wired: _present('customer360') },
 counts: { orders: d.orders.length },
 checks,
 };
}

module.exports = { run };
