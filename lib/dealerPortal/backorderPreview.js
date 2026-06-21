// lib/dealerPortal/backorderPreview.js — Backorder preview. No order/stock mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef } = require('./redactor');

function listBackorders(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.backorders || []).map((b) => {
    warnings.push('stock_unavailable');
    return { backorderIdPreview: maskRef(b.id, 'bo'), productIdPreview: maskRef(b.productId, 'prod'), qtyPreview: Number(b.qty || 0), expectedRestockPreview: b.expectedRestock || '' };
  });
  return safeResponse({ liveOrderMutation: false, liveStockMutation: false, backordersPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { listBackorders };
