// lib/dealerPortal/quotationRequestPreview.js — Draft a quotation request PREVIEW. Never creates a quote or sends a message.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, safeText } = require('./redactor');

function createQuotationRequestPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const items = Array.isArray(input.items) ? input.items.map((it) => ({
    productPreview: safeText(it.productId || it.id || 'prod'),
    qtyPreview: Number(it.qty || it.quantity || 0),
  })) : [];
  return safeResponse({
    liveQuotationCreation: false,
    liveMessageSend: false,
    dealerMasked: maskName(dealer.name),
    quotationPreview: {
      itemsPreview: items,
      validityPreview: '7_days_preview',
      notePreview: safeText(input.note || 'Quotation request draft — nothing is created or sent.'),
    },
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createQuotationRequestPreview };
