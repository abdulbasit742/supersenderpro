// lib/vendorPortal/vendorProfilePreview.js — Safe vendor profile preview. No mutation, PII masked.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { redactVendor } = require('./redactor');

function getVendorProfilePreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const r = redactVendor(vendor);
  const warnings = ['pii_masked'];
  if (!vendor.phone && !vendor.email) warnings.push('missing_vendor_contact');
  return safeResponse({
    liveProfileMutation: false,
    vendorNameSafe: r.vendorNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    addressMasked: r.addressMasked,
    taxRefMasked: r.taxRefMasked,
    bankRefMasked: 'bank_****',
    tierSafe: 'tier_preview',
    accountStatusPreview: `${vendor.accountStatus || 'active'}_preview`,
    warnings,
  });
}
module.exports = { getVendorProfilePreview };
