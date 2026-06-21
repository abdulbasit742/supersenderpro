// lib/dealerPortal/shipmentStatusPreview.js — Safe shipment status preview. Tracking ref masked. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listShipments(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const items = (dealer.shipments || []).map((s) => ({
    shipmentIdPreview: maskRef(s.id, 'shp'),
    statusPreview: `${safeText(s.status || 'unknown')}_preview`,
    trackingRefMasked: maskRef(s.trackingRef || 'trk', 'trk'),
  }));
  return safeResponse({ liveShipmentMutation: false, shipmentsPreview: items });
}
module.exports = { listShipments };
