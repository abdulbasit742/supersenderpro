// lib/dealerPortal/territoryPerformancePreview.js — Territory / region performance preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { safeText } = require('./redactor');

function getTerritoryPerformancePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const t = dealer.territory || {};
  return safeResponse({
    liveMutation: false,
    regionPreview: safeText(t.region || 'unknown'),
    performancePercentPreview: Number(t.performancePercentPreview || 0),
    rankPreview: Number(t.rankPreview || 0),
    dealersInRegionPreview: Number(t.dealersInRegionPreview || 0),
    warnings: [],
  });
}
module.exports = { getTerritoryPerformancePreview };
