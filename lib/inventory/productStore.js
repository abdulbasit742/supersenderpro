// lib/inventory/productStore.js — Manage products + their stock. A product: { sku, name, onHand,
// reserved, lowStockThreshold, active }. available = onHand - reserved. SKUs are unique (case-
// insensitive, upper-cased). Products are deactivated, never hard-deleted.

const store = require('./store');
const { config } = require('./config');

function _normSku(s) { return String(s || '').trim().toUpperCase(); }

function publicView(p) {
 if (!p) return null;
 const available = Math.max(0, (p.onHand || 0) - (p.reserved || 0));
 return { sku: p.sku, name: p.name, onHand: p.onHand || 0, reserved: p.reserved || 0, available, lowStockThreshold: p.lowStockThreshold ?? config.defaultLowStockThreshold, low: available <= (p.lowStockThreshold ?? config.defaultLowStockThreshold), outOfStock: available <= 0, active: p.active !== false, updatedAt: p.updatedAt || p.createdAt };
}

function upsert({ sku, name, onHand, lowStockThreshold, active } = {}) {
 const code = _normSku(sku);
 if (!code) throw new Error('sku is required');
 const d = store.load();
 let p = d.products.find((x) => x.sku === code);
 const now = store.nowIso();
 if (!p) { p = { sku: code, name: name || code, onHand: 0, reserved: 0, lowStockThreshold: config.defaultLowStockThreshold, active: true, createdAt: now }; d.products.push(p); }
 if (name !== undefined) p.name = String(name);
 if (onHand !== undefined) { const n = Number(onHand); if (Number.isFinite(n) && n >= 0) p.onHand = n; }
 if (lowStockThreshold !== undefined) { const n = Number(lowStockThreshold); if (Number.isFinite(n) && n >= 0) p.lowStockThreshold = n; }
 if (active !== undefined) p.active = !!active;
 p.updatedAt = now;
 store.save(d);
 return publicView(p);
}

function all() { return store.load().products.map(publicView); }
function get(sku) { return publicView(store.load().products.find((p) => p.sku === _normSku(sku))); }
function raw(d, sku) { return d.products.find((p) => p.sku === _normSku(sku)); }
function lowStock() { return all().filter((p) => p.active && p.low); }
function outOfStock() { return all().filter((p) => p.active && p.outOfStock); }

module.exports = { upsert, all, get, raw, lowStock, outOfStock, publicView, _normSku };
