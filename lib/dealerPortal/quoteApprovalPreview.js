// lib/dealerPortal/quoteApprovalPreview.js — Quote approval status preview. No approval mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function createQuoteApprovalPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const discount = Number(input.requestedDiscount || 0);
  const approvalRequired = discount > 10;
  return safeResponse({
    liveQuoteMutation: false,
    liveApprovalMutation: false,
    quoteIdPreview: 'quote_****',
    dealerMasked: maskName(dealer.name),
    approvalRequiredPreview: approvalRequired,
    approvalStatusPreview: approvalRequired ? 'pending_approval_preview' : 'auto_eligible_preview',
    warnings: approvalRequired ? ['approval_required'] : [],
  });
}
module.exports = { createQuoteApprovalPreview };
