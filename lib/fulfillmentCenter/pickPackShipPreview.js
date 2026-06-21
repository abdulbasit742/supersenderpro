  'use strict';


  /**
      * Fulfillment Center — pick / pack / ship previews.
      *
      * Each step advances fulfillment status WITHOUT any real action. Ship does NOT
      * book a courier or mutate stock; it only sets preview state.
      */


  const service = require('./fulfillmentService');
  const { redactDeep } = require('./redactor');

  function step(id, action) {
       const map = {
         pick: { from: ['pending'], to: 'picking_preview' },
           pack: { from: ['pending', 'picking_preview'], to: 'packed_preview' },
           ship: { from: ['packed_preview'], to: 'shipped_preview' },
       };
       const rule = map[action];
       if (!rule) return { ok: false, error: 'unknown action' };
       const updated = service.mutate(id, (o) => {
           o.fulfillmentStatus = rule.to;
           if (action === 'ship') o.deliveryStatus = 'in_transit_preview';
         return o;
       });
       if (!updated) return { ok: false, error: 'order not found' };
       const base = { ok: true, dryRun: true, orderId: updated.id, fulfillmentStatus: updated.fulfillmentStatus, warnings: [],
  blockers: [] };
    if (action === 'ship') return { ...base, liveCourierBooking: false, liveStockMutation: false, courierPreview:
  updated.courierPreview, trackingRefMasked: updated.trackingRefMasked, deliveryStatus: updated.deliveryStatus };
    return base;
  }


  module.exports = { pick: (id) => step(id, 'pick'), pack: (id) => step(id, 'pack'), ship: (id) => step(id, 'ship') };
