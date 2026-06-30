// lib/returns/refundCalc.js
// Pure functions to compute a proposed refund from returned line items.
// This module ONLY proposes numbers; it never charges or moves money.
// The Payments department (#1) owns all actual money movement.

'use strict';

const config = require('./config');

// lineItems: [{ sku, qty, unitPrice }]
function lineItemsTotal(lineItems) {
  if (!Array.isArray(lineItems)) return 0;
  return lineItems.reduce((sum, li) => {
    const qty = Number(li.qty) || 0;
    const price = Number(li.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
}

// Returns a breakdown object; restockingFeePct is fraction (e.g. 0.1 = 10%).
function computeRefund(lineItems, opts = {}) {
  const feePct = opts.restockingFeePct != null
    ? Number(opts.restockingFeePct)
    : config.restockingFeePct;
  const gross = lineItemsTotal(lineItems);
  const restockingFee = Math.round(gross * (feePct || 0) * 100) / 100;
  const net = Math.round((gross - restockingFee) * 100) / 100;
  return {
    gross,
    restockingFeePct: feePct || 0,
    restockingFee,
    net,
    currency: opts.currency || 'USD',
    computedAt: new Date().toISOString()
  };
}

module.exports = { lineItemsTotal, computeRefund };
