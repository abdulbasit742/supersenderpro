// lib/vendorPortal/deliveryStatusPreview.js — Safe inbound delivery status preview. No delivery mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef, safeText } = require('./redactor');

function listDeliveries(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const items = (vendor.deliveries || []).map((d) => ({
    deliveryIdPreview: maskRef(d.id, 'dlv'),
    poIdPreview: maskRef(d.poId || 'po', 'po'),
    statusPreview: `${safeText(d.status || 'unknown')}_preview`,
    carrierSafe: safeText(d.carrier || 'carrier'),
    etaPreview: d.eta || '',
  }));
  return safeResponse({ liveDeliveryMutation: false, deliveriesPreview: items });
}
module.exports = { listDeliveries };
