// lib/franchisePortal/targetAchievementPreview.js — Safe target vs achievement preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function getTargetAchievementPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const items = (franchise.outlets || []).map((o) => {
    const target = Number(o.target || 0);
    const sales = Number(o.salesMTD || 0);
    const pct = target > 0 ? Math.round((sales / target) * 100) : 0;
    if (pct < 80) warnings.push('below_target_preview');
    return {
      outletIdPreview: maskRef(o.id, 'outlet'),
      nameSafe: safeText(o.name),
      targetPreview: target,
      achievedPreview: sales,
      achievementPercentPreview: pct,
    };
  });
  return safeResponse({ liveTargetMutation: false, targetAchievementPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { getTargetAchievementPreview };
