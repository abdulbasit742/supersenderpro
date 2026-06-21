  'use strict';

  /** Fulfillment Center — failed-delivery queue (preview). */


  const service = require('./fulfillmentService');
  const { redactDeep } = require('./redactor');


  function list() {
      const orders = service.list({ limit: 5000 });
      const failed = orders.filter((o) => o.deliveryStatus === 'failed_attempt_preview' || o.fulfillmentStatus ===
  'failed_delivery_preview' || o.deliveryStatus === 'returned_to_sender_preview' || o.deliveryStatus === 'lost_preview');
    return { ok: true, dryRun: true, count: failed.length, orders: failed.map(redactDeep), warnings: [], blockers: [] };
  }


  module.exports = { list };
