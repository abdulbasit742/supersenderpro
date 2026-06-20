// lib/customerPortal/loyaltyStatusPreview.js — Safe loyalty / reward status previews.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');

function getLoyaltyStatusPreview(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const l = customer.loyalty || {};
  const warnings = [];
  if (l.expiringPoints > 0) warnings.push('loyalty_points_expiring');
  return safeResponse({
    liveRedemption: false,
    loyaltyPointsPreview: Number(l.points || 0),
    tierSafe: l.tier || 'Standard',
    expiringPointsPreview: Number(l.expiringPoints || 0),
    expiresAtPreview: l.expiresAt || '',
    warnings,
  });
}

module.exports = { getLoyaltyStatusPreview };
