// lib/dealerPortal/quoteNegotiationPreview.js — Quote negotiation preview. No quote/approval mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function createQuoteNegotiationPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const requested = Number(input.requestedDiscount || 0);
  const cap = 10; // preview cap
  const counter = requested > cap ? cap : requested;
  return safeResponse({
    liveQuoteMutation: false,
    liveApprovalMutation: false,
    quoteIdPreview: 'quote_****',
    dealerMasked: maskName(dealer.name),
    requestedDiscountPreview: requested,
    suggestedCounterOfferPreview: counter,
    approvalRequiredPreview: requested > cap,
    warnings: requested > cap ? ['approval_required'] : [],
  });
}
module.exports = { createQuoteNegotiationPreview };
