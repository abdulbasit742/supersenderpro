// lib/revenueOps/repPerformance.js — masked rep performance preview. Does NOT assign reps.
'use strict';
const { scoreDeal } = require('./dealScoring');
const { maskName, amountBand } = require('./redactor');

const VALUE_RANK = { low: 1, medium: 2, high: 3, enterprise: 4, unknown: 1 };
const RANK_BAND = { 1: 'low', 2: 'medium', 3: 'high', 4: 'enterprise' };

function repPerformance(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const byOwner = {};
  list.forEach((d) => {
    const owner = d.owner || 'Unassigned';
    byOwner[owner] = byOwner[owner] || { deals: [], hot: 0, overdue: 0, wins: 0, valueRankSum: 0 };
    const sc = scoreDeal(d);
    byOwner[owner].deals.push(d);
    if (sc.scoreLevel === 'Hot') byOwner[owner].hot += 1;
    if ((Number(d.lastContactDays) || 0) > 14 && !['Won Preview', 'Lost Preview'].includes(d.stage)) byOwner[owner].overdue += 1;
    if (d.stage === 'Won Preview') byOwner[owner].wins += 1;
    byOwner[owner].valueRankSum += VALUE_RANK[d.valueBand || amountBand(d.value).band] || 1;
  });

  return Object.keys(byOwner).map((owner) => {
    const o = byOwner[owner];
    const count = o.deals.length || 1;
    const conversionScore = Math.round((o.wins / count) * 100);
    const responseSpeedScore = Math.max(0, Math.min(100, 100 - Math.round((o.deals.reduce((a, d) => a + (Number(d.lastContactDays) || 0), 0) / count) * 4)));
    const avgRank = Math.round(o.valueRankSum / count);
    const riskNotes = [];
    if (o.overdue) riskNotes.push(o.overdue + ' overdue follow-ups (preview)');
    if (conversionScore < 20) riskNotes.push('low conversion in preview');
    return {
      maskedRepPreview: maskName(owner),
      assignedOpportunitiesCountPreview: o.deals.length,
      hotDealCountPreview: o.hot,
      overdueFollowupCountPreview: o.overdue,
      conversionScorePreview: conversionScore,
      responseSpeedScorePreview: responseSpeedScore,
      pipelineValueBandPreview: RANK_BAND[avgRank] || 'low',
      riskNotesPreview: riskNotes,
    };
  });
}
module.exports = { repPerformance };
