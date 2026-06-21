// lib/franchisePortal/inventoryAllocationPreview.js — Safe inventory/stock allocation preview. No stock mutation/reservation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function getInventoryAllocationPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const items = (franchise.inventoryAllocation || []).map((p) => {
    const onHand = Number(p.onHandQty || 0);
    const alloc = Number(p.allocatedQty || 0);
    if (onHand < alloc * 0.15) warnings.push('low_stock_preview');
    return {
      skuIdPreview: maskRef(p.id, 'sku'),
      nameSafe: safeText(p.name),
      allocatedQtyPreview: alloc,
      onHandQtyPreview: onHand,
    };
  });
  return safeResponse({ liveStockMutation: false, liveStockReservation: false, inventoryAllocationPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { getInventoryAllocationPreview };
