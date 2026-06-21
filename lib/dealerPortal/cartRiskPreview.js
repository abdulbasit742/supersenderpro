// lib/dealerPortal/cartRiskPreview.js — Cart risk preview (credit/stock/MOQ). No order/stock/credit mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function createCartRiskPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const items = Array.isArray(input.items) ? input.items : [];
  const warnings = [];
  const risks = [];
  let subtotal = 0;
  items.forEach((it) => {
    const product = catalog.find((c) => c.id === (it.productId || it.id));
    const qty = Number(it.qty || it.quantity || 0);
    if (!product) { risks.push('unknown_product'); return; }
    subtotal += qty * Number(product.dealerPrice || 0);
    if (Number(product.stock || 0) === 0) { risks.push('stock_unavailable'); warnings.push('stock_unavailable'); }
    else if (qty > Number(product.stock || 0)) { risks.push('insufficient_stock'); warnings.push('low_stock'); }
    if (product.moq && qty < product.moq) { risks.push('moq_not_met'); warnings.push('moq_not_met'); }
  });
  const credit = dealer.credit || {};
  const available = Number(credit.available != null ? credit.available : (credit.limit || 0) - (credit.used || 0));
  const creditExceeded = subtotal > available;
  if (creditExceeded) { risks.push('credit_limit_exceeded'); warnings.push('credit_limit_exceeded'); }
  const level = risks.length === 0 ? 'low' : risks.length <= 2 ? 'medium' : 'high';
  return safeResponse({
    liveOrderCreation: false,
    liveStockMutation: false,
    liveCreditMutation: false,
    dealerMasked: maskName(dealer.name),
    cartSubtotalPreview: subtotal,
    creditAvailablePreview: available,
    creditExceededPreview: creditExceeded,
    cartRiskLevelPreview: level,
    riskFlagsPreview: [...new Set(risks)],
    warnings: [...new Set(warnings)],
  });
}
module.exports = { createCartRiskPreview };
