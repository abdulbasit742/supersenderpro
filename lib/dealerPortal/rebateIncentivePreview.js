// lib/dealerPortal/rebateIncentivePreview.js — Rebate & incentive preview. No commission/payout mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getRebateIncentivePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const list = (dealer.rebates || []).map((r) => {
    if (r.atRisk) warnings.push('rebate_at_risk');
    return { rebateIdPreview: maskRef(r.id, 'reb'), schemeSafe: safeText(r.scheme), statusPreview: `${r.status || 'unknown'}_preview`, amountPreview: Number(r.amount || 0) };
  });
  return safeResponse({ liveCommissionMutation: false, livePayoutMutation: false, rebatesIncentivesPreview: list, warnings: [...new Set(warnings)] });
}
module.exports = { getRebateIncentivePreview };
