// lib/franchisePortal/royaltySummaryPreview.js — Safe royalty/fee summary preview. No payment/royalty mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName } = require('./redactor');

function getRoyaltySummaryPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const r = franchise.royalty || {};
  const warnings = [];
  if ((r.status || 'pending') !== 'paid') warnings.push('royalty_pending_preview');
  return safeResponse({
    liveRoyaltyMutation: false,
    livePaymentAction: false,
    franchiseMasked: maskName(franchise.name),
    royaltyPeriodPreview: r.period || '',
    royaltyRatePercentPreview: Number(r.ratePercent || 0),
    accruedRoyaltyPreview: Number(r.accrued || 0),
    royaltyStatusPreview: `${r.status || 'pending'}_preview`,
    warnings,
  });
}
module.exports = { getRoyaltySummaryPreview };
