// lib/dealerPortal/b2bAccountStatusPreview.js — Safe B2B account status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getB2bAccountStatusPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const status = dealer.accountStatus || 'active';
  if (status !== 'active') warnings.push('account_not_active');
  return safeResponse({
    liveAccountMutation: false,
    dealerMasked: maskName(dealer.name),
    accountStatusPreview: `${status}_preview`,
    creditHoldPreview: !!(dealer.credit && dealer.credit.hold),
    warnings,
  });
}
module.exports = { getB2bAccountStatusPreview };
