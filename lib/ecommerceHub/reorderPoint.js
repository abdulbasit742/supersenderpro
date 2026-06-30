'use strict';

/**
 * Ecommerce Hub — reorder-point / restock forecast (read-only heuristic).
 * Flags products at/under a reorder threshold so you restock before stockout.
 * Threshold = REORDER_POINT (default 5) or per-product override later.
 */

const registry = require('./registry');
async function build() {
  const products = await registry.allProducts();
  const rp = Number(process.env.REORDER_POINT || 5);
  const flagged = products.filter(function (p) { return p.stock != null && p.stock <= rp; })
    .map(function (p) { return { platform: p.platform, id: p.id, title: p.title, stock: p.stock, suggestedReorderQty: Math.max(10, rp * 4) }; });
  return { ok: true, reorderPoint: rp, flagged: flagged.length, items: flagged };
}
module.exports = { build };
