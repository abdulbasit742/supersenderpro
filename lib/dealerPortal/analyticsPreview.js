// lib/dealerPortal/analyticsPreview.js — B2B analytics dashboard preview. Aggregated, masked, no external call.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');

function safeCall(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

function getAnalyticsPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const orders = dealer.orders || [];
  const invoices = dealer.invoices || [];
  const totalOrderValue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const unpaid = invoices.filter((i) => (i.status || 'pending') !== 'paid');
  const target = safeCall(() => require('./targetAchievementPreview').getTargetAchievementPreview(input).achievementPercentPreview, 0);
  return safeResponse({
    liveMutation: false,
    externalCallsEnabled: false,
    metricsPreview: {
      totalOrdersPreview: orders.length,
      totalOrderValuePreview: totalOrderValue,
      openOrdersPreview: orders.filter((o) => o.status !== 'delivered').length,
      unpaidInvoicesPreview: unpaid.length,
      outstandingBalancePreview: unpaid.reduce((s, i) => s + Number(i.balance || 0), 0),
      achievementPercentPreview: target,
      loyaltyPointsPreview: (dealer.loyalty || {}).points || 0,
    },
    warnings: [],
  });
}
module.exports = { getAnalyticsPreview };
