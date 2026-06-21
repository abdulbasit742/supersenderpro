// lib/dealerPortal/branchStockPreview.js — Branch-wise stock preview. No stock mutation/reservation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getBranchStockPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.branches || []).map((b) => ({
    branchPreview: safeText(b.name),
    itemsPreview: (b.items || []).map((it) => {
      if (Number(it.qty || 0) === 0) warnings.push('stock_unavailable');
      else if (Number(it.qty || 0) < 20) warnings.push('low_stock');
      return { productIdPreview: maskRef(it.id, 'prod'), qtyPreview: Number(it.qty || 0), inStockPreview: Number(it.qty || 0) > 0 };
    }),
  }));
  return safeResponse({ liveStockMutation: false, liveStockReservation: false, branchStockPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { getBranchStockPreview };
