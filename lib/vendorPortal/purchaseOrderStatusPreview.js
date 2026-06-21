// lib/vendorPortal/purchaseOrderStatusPreview.js — Safe PO status previews. No PO mutation, ever.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { redactPurchaseOrder } = require('./redactor');

function listPurchaseOrders(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const pos = (vendor.purchaseOrders || []).map((o) => Object.assign(redactPurchaseOrder(o), { delayed: !!o.delayed }));
  return safeResponse({ livePOMutation: false, purchaseOrdersPreview: pos });
}

function getPurchaseOrderStatusPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const po = (vendor.purchaseOrders || [])[0] || {};
  const warnings = [];
  if (po.delayed) warnings.push('po_delayed_preview');
  return safeResponse({
    livePOMutation: false,
    poIdPreview: redactPurchaseOrder(po).poIdPreview,
    statusPreview: `${po.status || 'unknown'}_preview`,
    fulfillmentPreview: { etaPreview: po.eta || '', delayed: !!po.delayed },
    warnings,
  });
}
module.exports = { listPurchaseOrders, getPurchaseOrderStatusPreview };
