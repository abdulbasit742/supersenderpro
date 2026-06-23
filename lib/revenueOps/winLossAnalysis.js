// lib/revenueOps/winLossAnalysis.js — deterministic win/loss analysis preview. Read-only.
'use strict';

function rate(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

function lossReason(d) {
  if (d.complaintRisk) return 'service_concern_preview';
  if ((Number(d.lastContactDays) || 0) > 21) return 'no_response_preview';
  if (d.valueBand === 'low') return 'budget_preview';
  return 'price_or_other_preview';
}

function winLoss(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const won = list.filter((d) => d.stage === 'Won Preview');
  const lost = list.filter((d) => d.stage === 'Lost Preview');
  const closed = won.length + lost.length;

  const bySource = {};
  list.forEach((d) => { const s = d.source || 'unknown'; bySource[s] = bySource[s] || { won: 0, lost: 0 }; if (d.stage === 'Won Preview') bySource[s].won += 1; if (d.stage === 'Lost Preview') bySource[s].lost += 1; });
  const winRateBySourcePreview = Object.keys(bySource).map((s) => ({ source: s, winRate: rate(bySource[s].won, bySource[s].won + bySource[s].lost) }));

  const lossReasons = {};
  lost.forEach((d) => { const r = lossReason(d); lossReasons[r] = (lossReasons[r] || 0) + 1; });
  const lossReasonsPreview = Object.keys(lossReasons).map((r) => ({ reason: r, countPreview: lossReasons[r] }));

  return {
    overallWinRatePreview: rate(won.length, closed),
    wonCountPreview: won.length,
    lostCountPreview: lost.length,
    winRateBySourcePreview,
    lossReasonsPreview,
    topLossReasonPreview: lossReasonsPreview.sort((a, b) => b.countPreview - a.countPreview)[0] ? lossReasonsPreview[0].reason : 'none',
  };
}
module.exports = { winLoss };
