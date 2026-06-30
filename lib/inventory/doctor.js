// lib/inventory/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

function _present(name) { try { require('../' + name); return true; } catch (_e) { return false; } }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.products) && typeof d.reservations === 'object' && Array.isArray(d.ledger));
 ok('oversell_safe_default', config.allowOversell === false, config.allowOversell ? 'OVERSELL ALLOWED' : 'oversell blocked (safe)');
 ok('threshold_sane', config.defaultLowStockThreshold >= 0);
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, defaultLowStockThreshold: config.defaultLowStockThreshold, allowOversell: config.allowOversell, fanAlerts: config.fanAlerts && _present('alertCenter') },
 counts: { products: d.products.length, reservations: Object.keys(d.reservations).length, ledger: d.ledger.length },
 checks,
 };
}

module.exports = { run };
