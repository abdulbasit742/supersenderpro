// lib/dealerPortal/stockAvailabilityPreview.js — Safe stock availability preview. No stock mutation/reservation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getStockAvailabilityPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const items = (dealer.catalog || []).map((p) => {
    const qty = Number(p.stock || 0);
    if (qty <= 0) warnings.push('out_of_stock_preview');
    else if (qty < Number(p.moq || 0)) warnings.push('low_stock_preview');
    return {
      productIdPreview: maskRef(p.id, 'prod'),
      nameSafe: safeText(p.name),
      availabilityPreview: qty <= 0 ? 'out_of_stock_preview' : (qty < Number(p.moq || 0) ? 'low_stock_preview' : 'in_stock_preview'),
    };
  });
  return safeResponse({ liveStockMutation: false, liveStockReservation: false, stockAvailabilityPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { getStockAvailabilityPreview };
