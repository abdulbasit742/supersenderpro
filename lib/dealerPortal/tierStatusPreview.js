// lib/dealerPortal/tierStatusPreview.js — Safe reseller tier/status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getTierStatusPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  return safeResponse({
    liveTierMutation: false,
    dealerMasked: maskName(dealer.name),
    tierSafe: 'tier_preview',
    tierLabelPreview: `${String(dealer.tier || 'Silver').toLowerCase()}_preview`,
    benefitsPreview: ['dealer_pricing_preview', 'priority_support_preview'],
    warnings: [],
  });
}
module.exports = { getTierStatusPreview };
