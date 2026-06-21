// lib/dealerPortal/creditRiskPreview.js — Credit hold / risk preview. No credit mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getCreditRiskPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const c = dealer.credit || {};
  const limit = Number(c.limit || 0);
  const used = Number(c.used || 0);
  const available = Number(c.available != null ? c.available : limit - used);
  const overdue = (dealer.invoices || []).filter((i) => (i.status || 'pending') !== 'paid').reduce((s, i) => s + Number(i.balance || 0), 0);
  const warnings = [];
  let level = 'low';
  if (overdue > 0) { level = 'medium'; warnings.push('invoice_overdue'); }
  if (available <= limit * 0.1 || overdue > limit * 0.3) { level = 'high'; warnings.push('credit_limit_exceeded'); }
  if (c.hold) warnings.push('credit_hold');
  return safeResponse({
    liveCreditMutation: false,
    dealerMasked: maskName(dealer.name),
    creditLimitPreview: limit,
    usedCreditPreview: used,
    availableCreditPreview: available,
    overdueAmountPreview: overdue,
    creditRiskLevelPreview: level,
    creditHoldPreview: !!c.hold,
    recommendedActionPreview: level === 'high' ? 'review_account_preview' : 'none_preview',
    warnings: [...new Set(warnings)],
  });
}
module.exports = { getCreditRiskPreview };
