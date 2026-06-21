// lib/revenueOps/conversionAnalytics.js — deterministic conversion analytics from sample stage distribution.
'use strict';
const { STAGES } = require('./sampleDeals');

function rate(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

function conversion(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const counts = {};
  STAGES.forEach((s) => { counts[s] = 0; });
  list.forEach((d) => { counts[d.stage] = (counts[d.stage] || 0) + 1; });

  const leads = list.length;
  const qualified = (counts['Qualified'] || 0) + (counts['Demo / Discussion'] || 0) + (counts['Quotation Sent'] || 0) + (counts['Negotiation'] || 0) + (counts['Payment Pending'] || 0) + (counts['Won Preview'] || 0);
  const quoted = (counts['Quotation Sent'] || 0) + (counts['Negotiation'] || 0) + (counts['Payment Pending'] || 0) + (counts['Won Preview'] || 0);
  const won = counts['Won Preview'] || 0;
  const paymentPending = counts['Payment Pending'] || 0;

  // source analysis
  const bySource = {};
  list.forEach((d) => { const s = d.source || 'unknown'; bySource[s] = bySource[s] || { total: 0, won: 0 }; bySource[s].total += 1; if (d.stage === 'Won Preview') bySource[s].won += 1; });
  const sources = Object.keys(bySource).map((s) => ({ source: s, winRate: rate(bySource[s].won, bySource[s].total), total: bySource[s].total }));
  sources.sort((a, b) => b.winRate - a.winRate);

  // stuck stage = stage with most stale deals
  const stale = {};
  list.forEach((d) => { if ((Number(d.lastContactDays) || 0) > 14 && !['Won Preview', 'Lost Preview'].includes(d.stage)) stale[d.stage] = (stale[d.stage] || 0) + 1; });
  const topStuckStage = Object.keys(stale).sort((a, b) => stale[b] - stale[a])[0] || 'none';
  const avgDaysInStage = list.length ? Math.round(list.reduce((a, d) => a + (Number(d.lastContactDays) || 0), 0) / list.length) : 0;

  return {
    leadToQualifiedRatePreview: rate(qualified, leads),
    qualifiedToQuoteRatePreview: rate(quoted, qualified),
    quoteToWonRatePreview: rate(won, quoted),
    paymentPendingToWonRatePreview: rate(won, won + paymentPending),
    averageDaysInStagePreview: avgDaysInStage,
    topStuckStagePreview: topStuckStage,
    dropOffStagePreview: counts['Lost Preview'] ? 'Lost Preview' : (topStuckStage || 'none'),
    bestLeadSourcePreview: sources[0] ? sources[0].source : 'unknown',
    worstLeadSourcePreview: sources.length ? sources[sources.length - 1].source : 'unknown',
    sourceBreakdownPreview: sources,
  };
}
module.exports = { conversion };
