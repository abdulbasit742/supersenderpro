// lib/dealerPortal/paymentQueryPreview.js — Draft a payment query PREVIEW. No payment action, no live send.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, maskRef, safeText } = require('./redactor');

function createPaymentQueryPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  return safeResponse({
    livePaymentAction: false,
    liveMessageSend: false,
    dealerMasked: maskName(dealer.name),
    queryPreview: {
      invoiceIdPreview: maskRef(input.invoiceId || 'inv', 'inv'),
      subjectPreview: safeText(input.subject || 'Payment query'),
      messagePreview: safeText(input.message || 'Payment query draft — no payment is made and no message is sent.'),
    },
    warnings: ['live_send_disabled', 'payment_action_disabled'],
  });
}
module.exports = { createPaymentQueryPreview };
