// lib/dealerPortal/targetAchievementPreview.js — Dealer target/achievement preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getTargetAchievementPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const t = dealer.targets || {};
  const target = Number(t.targetPreview || 0);
  const achieved = Number(t.achievedPreview || 0);
  const pct = target ? Math.round((achieved / target) * 100) : 0;
  const warnings = [];
  if (pct < 80) warnings.push('dealer_target_missed');
  return safeResponse({
    liveMutation: false,
    dealerMasked: maskName(dealer.name),
    periodPreview: t.period || '',
    targetPreview: target,
    achievedPreview: achieved,
    achievementPercentPreview: pct,
    warnings,
  });
}
module.exports = { getTargetAchievementPreview };
