// lib/dealerPortal/orderStatusPreview.js — Safe order status previews. No order mutation, ever.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { redactOrder } = require('./redactor');

function listOrders(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const orders = (dealer.orders || []).map((o) => Object.assign(redactOrder(o), { delayed: !!o.delayed }));
  return safeResponse({ liveOrderMutation: false, ordersPreview: orders });
}

function getOrderStatusPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const order = (dealer.orders || [])[0] || {};
  const warnings = [];
  if (order.delayed) warnings.push('delayed_order_preview');
  return safeResponse({
    liveOrderMutation: false,
    orderIdPreview: redactOrder(order).orderIdPreview,
    statusPreview: `${order.status || 'unknown'}_preview`,
    fulfillmentPreview: { etaPreview: order.eta || '', delayed: !!order.delayed },
    warnings,
  });
}
module.exports = { listOrders, getOrderStatusPreview };
