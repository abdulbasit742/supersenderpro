// lib/franchisePortal/marketingFundPreview.js — Safe marketing/co-op fund preview. No fund mutation/payment.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName } = require('./redactor');

function getMarketingFundPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const m = franchise.marketingFund || {};
  return safeResponse({
    liveFundMutation: false,
    livePaymentAction: false,
    franchiseMasked: maskName(franchise.name),
    fundPeriodPreview: m.period || '',
    contributionPercentPreview: Number(m.contributionPercent || 0),
    fundBalancePreview: Number(m.balance || 0),
    fundStatusPreview: `${m.status || 'available'}_preview`,
    warnings: [],
  });
}
module.exports = { getMarketingFundPreview };
