// lib/franchisePortal/outletAccountStatusPreview.js — Safe outlet/branch account status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName } = require('./redactor');

function getOutletAccountStatusPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const outlets = franchise.outlets || [];
  const warnings = [];
  const active = outlets.filter((o) => o.status === 'active').length;
  if (outlets.some((o) => o.status === 'onboarding')) warnings.push('outlet_onboarding_preview');
  return safeResponse({
    liveAccountMutation: false,
    franchiseMasked: maskName(franchise.name),
    totalOutletsPreview: outlets.length,
    activeOutletsPreview: active,
    warnings,
  });
}
module.exports = { getOutletAccountStatusPreview };
