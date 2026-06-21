// lib/dealerPortal/tierDiscountPreview.js — Tier-based discount preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { safeText } = require('./redactor');

function getTierDiscountPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const td = dealer.tierDiscounts || {};
  const tier = String(dealer.tier || 'silver').toLowerCase();
  const warnings = [];
  if (!dealer.tier) warnings.push('tier_missing');
  return safeResponse({
    livePriceMutation: false,
    tierPreview: `${tier}_preview`,
    tierDiscountPercentPreview: Number(td[tier] || 0),
    allTierDiscountsPreview: Object.entries(td).map(([k, v]) => ({ tierPreview: `${safeText(k)}_preview`, percentPreview: Number(v) })),
    warnings,
  });
}
module.exports = { getTierDiscountPreview };
