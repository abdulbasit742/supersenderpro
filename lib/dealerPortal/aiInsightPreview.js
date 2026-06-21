// lib/dealerPortal/aiInsightPreview.js — AI insight preview WITHOUT any live AI call. Fully offline + deterministic.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');

function safeCall(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

function createAiInsightPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const risk = safeCall(() => require('./riskScorePreview').getRiskScorePreview(input), {});
  const analytics = safeCall(() => require('./analyticsPreview').getAnalyticsPreview(input), {});
  const m = (analytics.metricsPreview) || {};
  const recommendations = [];
  if ((m.unpaidInvoicesPreview || 0) > 0) recommendations.push('Clear overdue invoices to restore full credit availability.');
  if ((m.achievementPercentPreview || 100) < 80) recommendations.push('Increase order frequency to meet the monthly target.');
  if (!recommendations.length) recommendations.push('Account is healthy — explore upsell on top catalog items.');
  return safeResponse({
    liveAiCall: false,
    externalCallsEnabled: false,
    insightPreview: 'Offline rule-based insight — no live AI model was called.',
    recommendationPreview: recommendations,
    riskSignalsPreview: risk.riskSignalsPreview || [],
    warnings: [],
  });
}
module.exports = { createAiInsightPreview };
