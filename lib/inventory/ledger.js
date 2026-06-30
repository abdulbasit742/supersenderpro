// lib/inventory/ledger.js — Append an auditable stock movement. Every change (restock, reserve,
// release, commit, adjust) is recorded with before/after available so stock history is traceable.

const store = require('./store');
const { config } = require('./config');

function record(d, { sku, type, qty, orderId, reservationId, beforeAvailable, afterAvailable, note }) {
 d.ledger.push({ id: store.genId('mv'), sku, type, qty: Number(qty) || 0, orderId: orderId || null, reservationId: reservationId || null, beforeAvailable, afterAvailable, note: note || null, at: store.nowIso() });
 if (d.ledger.length > config.maxLedger) d.ledger = d.ledger.slice(-config.maxLedger);
}

function forSku(sku, limit = 100) { return store.load().ledger.filter((m) => m.sku === String(sku).toUpperCase()).slice(-limit).reverse(); }
function recent(limit = 100) { return store.load().ledger.slice(-limit).reverse(); }

module.exports = { record, forSku, recent };
