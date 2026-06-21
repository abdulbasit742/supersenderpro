// lib/dealerPortal/deliveryEtaRiskPreview.js — Delivery ETA risk preview. No delivery/shipment mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getDeliveryEtaRiskPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const now = Date.now();
  const warnings = [];
  const list = (dealer.deliveries || []).map((d) => {
    const eta = d.eta ? new Date(d.eta).getTime() : now;
    const late = eta < now || d.status === 'delayed';
    if (late) warnings.push('delivery_late');
    return {
      deliveryIdPreview: maskRef(d.id, 'dlv'),
      carrierSafe: safeText(d.carrier || 'carrier'),
      statusPreview: `${d.status || 'unknown'}_preview`,
      etaRiskPreview: late ? 'high' : 'low',
    };
  });
  return safeResponse({ liveDeliveryMutation: false, liveShipmentMutation: false, deliveryEtaRiskPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { getDeliveryEtaRiskPreview };
