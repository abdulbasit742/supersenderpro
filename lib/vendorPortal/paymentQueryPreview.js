// lib/vendorPortal/paymentQueryPreview.js — Draft a vendor payment query PREVIEW. No payment action, no live send.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName, maskRef, safeText } = require('./redactor');

function createPaymentQueryPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  return safeResponse({
    livePaymentAction: false,
    liveMessageSend: false,
    vendorMasked: maskName(vendor.name),
    queryPreview: {
      invoiceIdPreview: maskRef(input.invoiceId || 'vinv', 'vinv'),
      subjectPreview: safeText(input.subject || 'Payment query'),
      messagePreview: safeText(input.message || 'Payment query draft — no payment is made and no message is sent.'),
    },
    warnings: ['live_send_disabled', 'payment_action_disabled'],
  });
}
module.exports = { createPaymentQueryPreview };
