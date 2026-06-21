  'use strict';

  /** Fulfillment Center — order model vocab + builder. */


  const store = require('./store');
  const { maskPhone, maskEmail, maskAddress, safeName } = require('./redactor');

  const FULFILLMENT_STATUSES = ['pending', 'picking_preview', 'packed_preview', 'shipped_preview',
  'out_for_delivery_preview', 'delivered_preview', 'failed_delivery_preview', 'returned_preview', 'cancelled_preview'];
  const PAYMENT_STATUSES = ['unpaid_preview', 'cod_pending_preview', 'paid_preview', 'partially_paid_preview',
  'refunded_preview', 'payment_failed_preview'];
  const DELIVERY_STATUSES = ['not_booked', 'courier_assigned_preview', 'pickup_pending_preview', 'in_transit_preview',
  'out_for_delivery_preview', 'delivered_preview', 'failed_attempt_preview', 'returned_to_sender_preview', 'lost_preview'];


  function normalizeItems(items) {
    return (Array.isArray(items) ? items : []).slice(0, 100).map((it) => ({ sku: String((it && it.sku) || '').slice(0, 60),
  name: String((it && it.name) || 'Item').slice(0, 120), qty: Math.max(0, Number(it && it.qty) || 1), unitPrice:
  Math.max(0, Number(it && it.unitPrice) || 0) }));
  }

  function build(input, count) {
    const i = input || {};
       const now = new Date().toISOString();
       const items = normalizeItems(i.items);
       return {
         id: store.genId('ful'),
      orderNumber: i.orderNumber ? String(i.orderNumber).slice(0, 40) : `ORD-${new Date().getFullYear()}-${String((count ||
  0) + 1).padStart(4, '0')}`,


        customerNameSafe: safeName(i.customerName || i.customerId),
        phoneMasked: i.phone ? maskPhone(i.phone) : null,
        emailMasked: i.email ? maskEmail(i.email) : null,
        addressMasked: i.address ? maskAddress(i.address) : null,
        sourceModule: String(i.sourceModule || 'manual').slice(0, 40),
        items,
        paymentStatus: PAYMENT_STATUSES.includes(i.paymentStatus) ? i.paymentStatus : 'cod_pending_preview',
        fulfillmentStatus: 'pending',
        deliveryStatus: 'not_booked',
        courierPreview: null,
        trackingRefMasked: null,
        totalPreview: items.reduce((s, it) => s + it.qty * it.unitPrice, 0),
        currency: String(i.currency || 'PKR').slice(0, 8),
        dryRun: true,
        createdAt: now,
        updatedAt: now,
      };
  }


  module.exports = { FULFILLMENT_STATUSES, PAYMENT_STATUSES, DELIVERY_STATUSES, build, normalizeItems };
