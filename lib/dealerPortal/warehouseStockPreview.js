// lib/dealerPortal/warehouseStockPreview.js — Warehouse-wise stock preview. No stock mutation/reservation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getWarehouseStockPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.warehouses || []).map((w) => ({
    warehousePreview: safeText(w.name),
    itemsPreview: (w.items || []).map((it) => {
      if (Number(it.qty || 0) === 0) warnings.push('stock_unavailable');
      else if (Number(it.qty || 0) < 50) warnings.push('low_stock');
      return { productIdPreview: maskRef(it.id, 'prod'), qtyPreview: Number(it.qty || 0), inStockPreview: Number(it.qty || 0) > 0 };
    }),
  }));
  return safeResponse({ liveStockMutation: false, liveStockReservation: false, warehouseStockPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { getWarehouseStockPreview };
