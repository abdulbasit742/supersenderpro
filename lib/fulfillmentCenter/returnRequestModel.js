  'use strict';


  /** Fulfillment Center — return/RMA model vocab + builder. */


  const store = require('./store');
  const { safeName, maskPhone } = require('./redactor');
  const { normalizeItems } = require('./orderFulfillmentModel');


  const RETURN_STATUSES = ['requested', 'under_review_preview', 'approved_preview', 'rejected_preview',
  'item_received_preview', 'refunded_preview', 'exchanged_preview', 'closed_preview'];
  const RETURN_REASONS = ['wrong_item', 'damaged_item', 'defective_item', 'customer_changed_mind', 'size_or_variant_issue',
  'delivery_failed', 'duplicate_order', 'other'];


  function build(input, count) {
    const i = input || {};
      const now = new Date().toISOString();
      return {
        id: store.genId('rma'),
        rmaNumber: `RMA-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`,
        orderId: i.orderId ? String(i.orderId) : null,
        customerNameSafe: safeName(i.customerName || i.customerId),
        phoneMasked: i.phone ? maskPhone(i.phone) : null,
        reason: RETURN_REASONS.includes(i.reason) ? i.reason : 'other',
        requestedItems: normalizeItems(i.requestedItems),
        status: 'requested',
        refundAmountPreview: 0,
        restockPreview: [],
        lossImpactPreview: 0,
        dryRun: true,
        createdAt: now,
        updatedAt: now,


   };
}

module.exports = { RETURN_STATUSES, RETURN_REASONS, build };
