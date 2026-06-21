// lib/dealerPortal/dealerProfilePreview.js — Safe dealer profile preview. No mutation, PII masked.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { redactDealer } = require('./redactor');

function getDealerProfilePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const r = redactDealer(dealer);
  const warnings = ['pii_masked'];
  if (!dealer.phone && !dealer.email) warnings.push('missing_dealer_contact');
  return safeResponse({
    liveProfileMutation: false,
    dealerNameSafe: r.dealerNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    addressMasked: r.addressMasked,
    taxRefMasked: r.taxRefMasked,
    tierSafe: 'tier_preview',
    accountStatusPreview: `${dealer.accountStatus || 'active'}_preview`,
    warnings,
  });
}
module.exports = { getDealerProfilePreview };
