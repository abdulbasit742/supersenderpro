// lib/vendorPortal/accountStatusPreview.js — Safe supplier account status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName } = require('./redactor');

function getAccountStatusPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const warnings = [];
  const status = vendor.accountStatus || 'active';
  if (status !== 'active') warnings.push('account_not_active');
  return safeResponse({
    liveAccountMutation: false,
    vendorMasked: maskName(vendor.name),
    accountStatusPreview: `${status}_preview`,
    warnings,
  });
}
module.exports = { getAccountStatusPreview };
