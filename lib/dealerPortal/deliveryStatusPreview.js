// lib/dealerPortal/deliveryStatusPreview.js — Safe delivery status preview. No delivery confirmation/mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listDeliveries(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const items = (dealer.deliveries || []).map((d) => ({
    deliveryIdPreview: maskRef(d.id, 'dlv'),
    statusPreview: `${safeText(d.status || 'unknown')}_preview`,
    carrierSafe: safeText(d.carrier || 'carrier'),
    etaPreview: d.eta || '',
  }));
  return safeResponse({ liveDeliveryMutation: false, deliveriesPreview: items });
}
module.exports = { listDeliveries };
