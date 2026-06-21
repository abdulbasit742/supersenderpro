// lib/franchisePortal/replenishmentDraftPreview.js — Draft a replenishment order PREVIEW. Never creates an order or reserves stock.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName, maskRef, safeText } = require('./redactor');

function createReplenishmentDraftPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const lines = Array.isArray(input.items) ? input.items.map((it) => ({
    skuPreview: maskRef(it.sku || it.skuId || 'sku', 'sku'),
    qtyPreview: Number(it.qty || it.quantity || 0),
  })) : [];
  const warnings = [];
  if (!lines.length) warnings.push('empty_replenishment_preview');
  return safeResponse({
    liveOrderCreation: false,
    liveStockMutation: false,
    liveStockReservation: false,
    franchiseMasked: maskName(franchise.name),
    replenishmentDraftPreview: {
      outletIdPreview: maskRef(input.outletId || 'outlet', 'outlet'),
      itemsPreview: lines,
      itemCountPreview: lines.length,
    },
    notePreview: safeText(input.note || 'Replenishment draft — nothing is ordered or reserved. Contact your franchise manager to place a real order.'),
    warnings,
  });
}
module.exports = { createReplenishmentDraftPreview };
