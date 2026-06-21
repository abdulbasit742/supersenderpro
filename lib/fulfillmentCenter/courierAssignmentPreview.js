  'use strict';

  /** Fulfillment Center — courier assignment preview (no real booking). */


  const service = require('./fulfillmentService');
  const { maskRef } = require('./redactor');


  const COURIERS = ['TCS', 'Leopards', 'Trax', 'PostEx', 'M&P', 'BlueEx'];

  function preview(id, courier) {
    const chosen = COURIERS.includes(courier) ? courier : COURIERS[0];
       // generate a fake, masked tracking ref (never a real booking).
       const fakeRef = `${chosen.slice(0, 2).toUpperCase()}${Date.now().toString().slice(-8)}`;
       const updated = service.mutate(id, (o) => {
         o.courierPreview = chosen;
           o.trackingRefMasked = maskRef(fakeRef);
           if (o.deliveryStatus === 'not_booked') o.deliveryStatus = 'courier_assigned_preview';
         return o;
       });
       if (!updated) return { ok: false, error: 'order not found' };
       return { ok: true, dryRun: true, liveCourierBooking: false, orderId: updated.id, courierPreview: chosen,
  trackingRefMasked: updated.trackingRefMasked, deliveryStatus: updated.deliveryStatus, warnings: [], blockers:
  ['live_courier_booking_disabled'] };
  }


  module.exports = { preview, COURIERS };
