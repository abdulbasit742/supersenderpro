// lib/customerPortal/orderStatusPreview.js — Safe order status previews. No order mutation, ever.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef } = require('./redactor');

function listOrders(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const orders = (customer.orders || []).map((o) => ({
    orderIdPreview: maskRef(o.id, 'ord'),
    statusPreview: `${o.status}_preview`,
    paymentStatusPreview: `${o.payment}_preview`,
    delayed: !!o.delayed,
  }));
  return safeResponse({ liveOrderMutation: false, ordersPreview: orders });
}

function getOrderStatusPreview(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const order = (customer.orders || [])[0] || {};
  const warnings = [];
  if (order.delayed) warnings.push('delayed_order');
  if (order.payment === 'unpaid') warnings.push('unpaid_invoice');
  return safeResponse({
    liveOrderMutation: false,
    orderIdPreview: maskRef(order.id || 'ord', 'ord'),
    statusPreview: `${order.status || 'unknown'}_preview`,
    fulfillmentPreview: { etaPreview: order.eta || '', delayed: !!order.delayed },
    paymentStatusPreview: `${order.payment || 'unknown'}_preview`,
    warnings,
  });
}

module.exports = { listOrders, getOrderStatusPreview };
