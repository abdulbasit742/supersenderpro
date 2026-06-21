// lib/dealerPortal/creditLimitPreview.js — Safe credit limit preview. No credit approval/mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getCreditLimitPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const c = dealer.credit || {};
  const limit = Number(c.limit || 0);
  const used = Number(c.used || 0);
  const available = Number(c.available != null ? c.available : limit - used);
  const warnings = [];
  if (c.hold) warnings.push('credit_hold_preview');
  if (available <= limit * 0.1) warnings.push('credit_low_preview');
  return safeResponse({
    liveCreditMutation: false,
    dealerMasked: maskName(dealer.name),
    creditLimitPreview: limit,
    usedCreditPreview: used,
    availableCreditPreview: available,
    creditHoldPreview: !!c.hold,
    warnings,
  });
}
module.exports = { getCreditLimitPreview };
