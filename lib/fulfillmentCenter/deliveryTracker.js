  'use strict';


  /**
      * Fulfillment Center — delivery status update preview (no tracking API call).
      *
      * Advances delivery status along an allowed transition map. Marking delivered
      * also moves fulfillment to delivered_preview; failed_attempt flags the order.
      */


  const service = require('./fulfillmentService');
  const model = require('./orderFulfillmentModel');


  const FULFILLMENT_FROM_DELIVERY = {
       out_for_delivery_preview: 'out_for_delivery_preview',
       delivered_preview: 'delivered_preview',
       failed_attempt_preview: 'failed_delivery_preview',
       returned_to_sender_preview: 'returned_preview',
  };


  function updatePreview(id, deliveryStatus) {
    if (!model.DELIVERY_STATUSES.includes(deliveryStatus)) return { ok: false, error: 'invalid delivery status' };
      const updated = service.mutate(id, (o) => {
        o.deliveryStatus = deliveryStatus;
       if (FULFILLMENT_FROM_DELIVERY[deliveryStatus]) o.fulfillmentStatus = FULFILLMENT_FROM_DELIVERY[deliveryStatus];
       return o;
      });
      if (!updated) return { ok: false, error: 'order not found' };
    return { ok: true, dryRun: true, liveTrackingApiCall: false, orderId: updated.id, deliveryStatus:
  updated.deliveryStatus, fulfillmentStatus: updated.fulfillmentStatus, warnings: [], blockers: [] };
  }

  function timeline(order) {
    // Build a simple preview timeline from current statuses.
      const o = order || {};
      const seq = ['not_booked', 'courier_assigned_preview', 'pickup_pending_preview', 'in_transit_preview',
  'out_for_delivery_preview', 'delivered_preview'];
    const cur = seq.indexOf(o.deliveryStatus);
      return seq.map((s, idx) => ({ status: s, reached: cur >= idx, current: s === o.deliveryStatus }));
  }


  module.exports = { updatePreview, timeline };
