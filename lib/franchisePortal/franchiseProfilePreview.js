// lib/franchisePortal/franchiseProfilePreview.js — Safe franchise profile preview. No mutation, PII masked.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { redactFranchise } = require('./redactor');

function getFranchiseProfilePreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const r = redactFranchise(franchise);
  const warnings = ['pii_masked'];
  if (!franchise.phone && !franchise.email) warnings.push('missing_franchise_contact');
  return safeResponse({
    liveProfileMutation: false,
    franchiseNameSafe: r.franchiseNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    addressMasked: r.addressMasked,
    taxRefMasked: r.taxRefMasked,
    tierSafe: 'tier_preview',
    agreementStatusPreview: `${franchise.agreementStatus || 'active'}_preview`,
    warnings,
  });
}
module.exports = { getFranchiseProfilePreview };
