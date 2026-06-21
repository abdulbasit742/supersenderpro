// lib/franchisePortal/orderStatusPreview.js — Safe replenishment order status previews. No order mutation, ever.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { redactOrder } = require('./redactor');

function listOrders(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const orders = (franchise.replenishmentOrders || []).map((o) => Object.assign(redactOrder(o), { delayed: !!o.delayed }));
  return safeResponse({ liveOrderMutation: false, ordersPreview: orders });
}

function getOrderStatusPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const order = (franchise.replenishmentOrders || [])[0] || {};
  const warnings = [];
  if (order.delayed) warnings.push('order_delayed_preview');
  return safeResponse({
    liveOrderMutation: false,
    orderIdPreview: redactOrder(order).orderIdPreview,
    statusPreview: `${order.status || 'unknown'}_preview`,
    fulfillmentPreview: { etaPreview: order.eta || '', delayed: !!order.delayed },
    warnings,
  });
}
module.exports = { listOrders, getOrderStatusPreview };
