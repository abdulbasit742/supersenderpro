// lib/dealerPortal/riskScorePreview.js — Aggregated dealer risk score preview. No mutation, no external call.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function safeCall(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

function getRiskScorePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const credit = safeCall(() => require('./creditRiskPreview').getCreditRiskPreview(input), {});
  const target = safeCall(() => require('./targetAchievementPreview').getTargetAchievementPreview(input), {});
  const signals = [];
  let score = 100;
  if (credit.creditRiskLevelPreview === 'high') { score -= 35; signals.push('credit_limit_exceeded'); }
  else if (credit.creditRiskLevelPreview === 'medium') { score -= 15; signals.push('invoice_overdue'); }
  if (credit.creditHoldPreview) { score -= 20; signals.push('credit_hold'); }
  if ((target.achievementPercentPreview || 100) < 80) { score -= 15; signals.push('dealer_target_missed'); }
  score = Math.max(0, Math.min(100, score));
  const level = score >= 75 ? 'low' : score >= 50 ? 'medium' : 'high';
  return safeResponse({
    liveMutation: false,
    externalCallsEnabled: false,
    dealerMasked: maskName(dealer.name),
    riskScorePreview: score,
    riskLevelPreview: level,
    riskSignalsPreview: [...new Set(signals)],
    warnings: [],
  });
}
module.exports = { getRiskScorePreview };
