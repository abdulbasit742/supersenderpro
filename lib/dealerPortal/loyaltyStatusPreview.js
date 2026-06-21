// lib/dealerPortal/loyaltyStatusPreview.js — Safe loyalty/reward status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, safeText } = require('./redactor');

function getLoyaltyStatusPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const l = dealer.loyalty || {};
  const warnings = [];
  if (Number(l.expiringPoints || 0) > 0) warnings.push('points_expiring_preview');
  return safeResponse({
    liveLoyaltyMutation: false,
    dealerMasked: maskName(dealer.name),
    loyaltyPointsPreview: Number(l.points || 0),
    tierSafe: safeText(String(l.tier || 'tier') + '_preview'),
    expiringPointsPreview: Number(l.expiringPoints || 0),
    warnings,
  });
}
module.exports = { getLoyaltyStatusPreview };
