// lib/dealerPortal/bulkOrderDraftPreview.js — Draft a bulk B2B order PREVIEW. Never creates an order or reserves stock.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, maskRef, safeText } = require('./redactor');

function createBulkOrderDraftPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const priceOf = (id) => { const p = catalog.find((c) => c.id === id); return p ? Number(p.dealerPrice || 0) : 0; };
  const warnings = [];
  const reqItems = Array.isArray(input.items) ? input.items : [];
  const items = reqItems.map((it) => {
    const qty = Number(it.qty || it.quantity || 0);
    const unit = priceOf(it.productId || it.id);
    return {
      productIdPreview: maskRef(it.productId || it.id || 'prod', 'prod'),
      qtyPreview: qty,
      unitPricePreview: unit,
      lineTotalPreview: qty * unit,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.lineTotalPreview, 0);
  const discount = Math.round(subtotal * 0.0);
  const tax = 0;
  const delivery = 0;
  if (!items.length) warnings.push('empty_order_preview');
  return safeResponse({
    liveOrderCreation: false,
    liveStockMutation: false,
    liveStockReservation: false,
    livePriceMutation: false,
    dealerMasked: maskName(dealer.name),
    orderDraftPreview: {
      itemsPreview: items,
      subtotalPreview: subtotal,
      discountPreview: discount,
      taxPreview: tax,
      deliveryChargesPreview: delivery,
      totalPreview: subtotal - discount + tax + delivery,
    },
    notePreview: safeText(input.note || 'Bulk order draft — nothing is ordered or reserved. Contact your account manager to place a real order.'),
    warnings,
  });
}
module.exports = { createBulkOrderDraftPreview };
