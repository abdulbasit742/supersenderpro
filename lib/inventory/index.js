// lib/inventory/index.js — Inventory & Stock (barrel export).
//
// Track product stock with an available/reserved split, and run the reserve -> commit/release flow
// so an order can hold stock without overselling: reserve() at checkout, commit() on fulfillment
// (decrements on-hand), release() on cancel (returns reserved). restock()/adjust() change on-hand;
// an auditable ledger records every movement. Low-stock + out-of-stock CROSSINGS fan into alerts
// #28. Pairs with orders #63 (reserveOrder on place, commit on fulfill, release on cancel).
//
// SAFETY: JSON-backed; all stock ops are atomic over a single read/write so concurrent reserves
// can't oversell (hard stop at 0 unless INVENTORY_ALLOW_OVERSELL=true). This module never sends.
// Products deactivated, never hard-deleted.

const { config } = require('./config');

module.exports = {
 config,
 store: require('./store'),
 productStore: require('./productStore'),
 ledger: require('./ledger'),
 stockEngine: require('./stockEngine'),
 doctor: require('./doctor'),
 // convenience
 reserve: require('./stockEngine').reserve,
 commit: require('./stockEngine').commit,
 release: require('./stockEngine').release,
};
