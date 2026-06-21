// lib/dealerPortal/commissionMarginPreview.js — Safe commission/margin preview. No commission mutation/payout.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getCommissionMarginPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const c = dealer.commission || {};
  const warnings = [];
  if ((c.payoutStatus || 'pending') !== 'paid') warnings.push('commission_pending_preview');
  return safeResponse({
    liveCommissionMutation: false,
    livePaymentAction: false,
    dealerMasked: maskName(dealer.name),
    commissionPeriodPreview: c.period || '',
    marginPercentPreview: Number(c.marginPercentPreview || 0),
    accruedCommissionPreview: Number(c.accruedPreview || 0),
    payoutStatusPreview: `${c.payoutStatus || 'pending'}_preview`,
    warnings,
  });
}
module.exports = { getCommissionMarginPreview };
