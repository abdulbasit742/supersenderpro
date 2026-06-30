// lib/inventory/stockEngine.js — Core stock operations, all atomic over a single store read/write
// so concurrent reserves can't oversell. reserve() holds stock for an order (available must cover
// it unless oversell is on); commit() converts a reservation into a real stock decrement on
// fulfillment; release() returns reserved stock on cancel; restock()/adjust() change on-hand.
// Low/out-of-stock CROSSINGS (available dropping to/below threshold or to 0) fan into alerts #28.

const store = require('./store');
const { config } = require('./config');
const productStore = require('./productStore');
const ledger = require('./ledger');

let alerts = null; try { alerts = require('../alertCenter'); } catch (_e) { alerts = null; }

function _avail(p) { return Math.max(0, (p.onHand || 0) - (p.reserved || 0)); }
function _threshold(p) { return p.lowStockThreshold ?? config.defaultLowStockThreshold; }

async function _fanCrossings(p, before, after) {
 if (!config.fanAlerts || !alerts) return;
 const thr = _threshold(p);
 try {
 if (before > 0 && after <= 0) await alerts.emit('stock.out', { sku: p.sku, name: p.name, available: after });
 else if (before > thr && after <= thr) await alerts.emit('stock.low', { sku: p.sku, name: p.name, available: after, threshold: thr });
 } catch (_e) { /* non-fatal */ }
}

// Reserve qty of a SKU for an order. Returns { ok, reservationId } or { ok:false, reason }.
async function reserve({ sku, qty = 1, orderId } = {}) {
 const q = Number(qty);
 if (!(q > 0)) throw new Error('qty must be > 0');
 const d = store.load();
 const p = productStore.raw(d, sku);
 if (!p) return { ok: false, reason: 'unknown sku' };
 if (p.active === false) return { ok: false, reason: 'product inactive' };
 const before = _avail(p);
 if (!config.allowOversell && before < q) return { ok: false, reason: 'insufficient stock', available: before, requested: q };
 p.reserved = (p.reserved || 0) + q; p.updatedAt = store.nowIso();
 const reservationId = store.genId('rsv');
 d.reservations[reservationId] = { sku: p.sku, qty: q, orderId: orderId || null, at: store.nowIso(), status: 'held' };
 const after = _avail(p);
 ledger.record(d, { sku: p.sku, type: 'reserve', qty: q, orderId, reservationId, beforeAvailable: before, afterAvailable: after });
 store.save(d);
 await _fanCrossings(p, before, after);
 return { ok: true, reservationId, sku: p.sku, available: after };
}

// Commit a held reservation: actually decrement on-hand (and the reserved counter). Used on fulfillment.
async function commit(reservationId) {
 const d = store.load();
 const r = d.reservations[reservationId];
 if (!r) return { ok: false, reason: 'unknown reservation' };
 if (r.status !== 'held') return { ok: false, reason: 'reservation ' + r.status };
 const p = productStore.raw(d, r.sku);
 if (!p) return { ok: false, reason: 'unknown sku' };
 const before = _avail(p);
 p.onHand = Math.max(0, (p.onHand || 0) - r.qty);
 p.reserved = Math.max(0, (p.reserved || 0) - r.qty);
 p.updatedAt = store.nowIso();
 r.status = 'committed'; r.committedAt = store.nowIso();
 const after = _avail(p);
 ledger.record(d, { sku: p.sku, type: 'commit', qty: r.qty, orderId: r.orderId, reservationId, beforeAvailable: before, afterAvailable: after });
 store.save(d);
 return { ok: true, sku: p.sku, onHand: p.onHand, available: after };
}

// Release a held reservation back to available (cancel).
function release(reservationId) {
 const d = store.load();
 const r = d.reservations[reservationId];
 if (!r) return { ok: false, reason: 'unknown reservation' };
 if (r.status !== 'held') return { ok: false, reason: 'reservation ' + r.status };
 const p = productStore.raw(d, r.sku);
 if (!p) return { ok: false, reason: 'unknown sku' };
 const before = _avail(p);
 p.reserved = Math.max(0, (p.reserved || 0) - r.qty); p.updatedAt = store.nowIso();
 r.status = 'released'; r.releasedAt = store.nowIso();
 const after = _avail(p);
 ledger.record(d, { sku: p.sku, type: 'release', qty: r.qty, orderId: r.orderId, reservationId, beforeAvailable: before, afterAvailable: after });
 store.save(d);
 return { ok: true, sku: p.sku, available: after };
}

// Add stock (purchase/restock).
function restock(sku, qty, note) {
 const q = Number(qty); if (!(q > 0)) throw new Error('qty must be > 0');
 const d = store.load(); const p = productStore.raw(d, sku);
 if (!p) throw new Error('unknown sku');
 const before = _avail(p);
 p.onHand = (p.onHand || 0) + q; p.updatedAt = store.nowIso();
 const after = _avail(p);
 ledger.record(d, { sku: p.sku, type: 'restock', qty: q, beforeAvailable: before, afterAvailable: after, note });
 store.save(d);
 return productStore.publicView(p);
}

// Manual adjustment (corrections / shrinkage). delta may be negative.
async function adjust(sku, delta, note) {
 const dn = Number(delta); if (!Number.isFinite(dn) || dn === 0) throw new Error('delta must be a non-zero number');
 const d = store.load(); const p = productStore.raw(d, sku);
 if (!p) throw new Error('unknown sku');
 const before = _avail(p);
 p.onHand = Math.max(0, (p.onHand || 0) + dn); p.updatedAt = store.nowIso();
 const after = _avail(p);
 ledger.record(d, { sku: p.sku, type: 'adjust', qty: dn, beforeAvailable: before, afterAvailable: after, note });
 store.save(d);
 await _fanCrossings(p, before, after);
 return productStore.publicView(p);
}

// Reserve all line items of an order at once; rolls back partial reservations on any failure.
async function reserveOrder(orderId, items = []) {
 const made = [];
 for (const li of items) {
 if (!li.sku) continue;
 const r = await reserve({ sku: li.sku, qty: li.qty || 1, orderId }); // eslint-disable-line no-await-in-loop
 if (!r.ok) { for (const m of made) release(m.reservationId); return { ok: false, reason: r.reason, failedSku: productStore._normSku(li.sku) }; }
 made.push(r);
 }
 return { ok: true, reservations: made };
}

function overview() {
 const products = productStore.all();
 return {
 generatedAt: store.nowIso(),
 cards: {
 products: products.length,
 active: products.filter((p) => p.active).length,
 low: products.filter((p) => p.active && p.low).length,
 outOfStock: products.filter((p) => p.active && p.outOfStock).length,
 totalOnHand: products.reduce((s, p) => s + (p.onHand || 0), 0),
 totalReserved: products.reduce((s, p) => s + (p.reserved || 0), 0),
 },
 lowStock: products.filter((p) => p.active && p.low).map((p) => ({ sku: p.sku, name: p.name, available: p.available, threshold: p.lowStockThreshold })),
 };
}

module.exports = { reserve, commit, release, restock, adjust, reserveOrder, overview };
