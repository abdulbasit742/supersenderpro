// lib/dealerPortal/partialShipmentPreview.js — Partial shipment preview. No shipment/delivery mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef } = require('./redactor');

function listPartialShipments(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.partialShipments || []).map((p) => {
    warnings.push('shipment_partial');
    return { shipmentIdPreview: maskRef(p.id, 'ps'), orderIdPreview: maskRef(p.orderId, 'ord'), shippedQtyPreview: Number(p.shippedQty || 0), pendingQtyPreview: Number(p.pendingQty || 0), statusPreview: `${p.status || 'partial'}_preview` };
  });
  return safeResponse({ liveShipmentMutation: false, liveDeliveryMutation: false, partialShipmentsPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { listPartialShipments };
