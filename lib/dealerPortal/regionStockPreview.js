// lib/dealerPortal/regionStockPreview.js — Region-wise stock preview. No stock mutation/reservation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getRegionStockPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.regions || []).map((rg) => ({
    regionPreview: safeText(rg.name),
    itemsPreview: (rg.items || []).map((it) => {
      if (Number(it.qty || 0) === 0) warnings.push('stock_unavailable');
      else if (Number(it.qty || 0) < 50) warnings.push('low_stock');
      return { productIdPreview: maskRef(it.id, 'prod'), qtyPreview: Number(it.qty || 0), inStockPreview: Number(it.qty || 0) > 0 };
    }),
  }));
  return safeResponse({ liveStockMutation: false, liveStockReservation: false, regionStockPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { getRegionStockPreview };
