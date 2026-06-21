// lib/dealerPortal/businessVerificationPreview.js — Business verification preview. No KYC mutation, no document download.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getBusinessVerificationPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const v = dealer.businessVerification || {};
  const warnings = [];
  if (!v.taxVerified) warnings.push('tax_ref_masked');
  if (!v.bankVerified) warnings.push('compliance_required');
  return safeResponse({
    liveVerificationMutation: false,
    liveDocumentDownload: false,
    dealerMasked: maskName(dealer.name),
    verificationStatusPreview: `${v.status || 'unverified'}_preview`,
    businessNameVerifiedPreview: !!v.businessNameVerified,
    taxVerifiedPreview: !!v.taxVerified,
    bankVerifiedPreview: !!v.bankVerified,
    addressVerifiedPreview: !!v.addressVerified,
    warnings,
  });
}
module.exports = { getBusinessVerificationPreview };
