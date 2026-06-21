// lib/revenueOps/dealAging.js — deterministic deal aging buckets + stale detector. Read-only, PII masked.
'use strict';
const { maskName, maskRef } = require('./redactor');

function aging(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const buckets = { fresh_0_7: 0, warm_8_14: 0, aging_15_30: 0, stale_30_plus: 0 };
  const staleDealsPreview = [];
  const stageAge = {};
  list.forEach((d) => {
    if (['Won Preview', 'Lost Preview'].includes(d.stage)) return;
    const days = Number(d.lastContactDays) || 0;
    if (days <= 7) buckets.fresh_0_7 += 1;
    else if (days <= 14) buckets.warm_8_14 += 1;
    else if (days <= 30) buckets.aging_15_30 += 1;
    else buckets.stale_30_plus += 1;
    if (days > 14) staleDealsPreview.push({ opportunityIdPreview: maskRef(d.id || 'opp'), maskedCustomerName: maskName(d.customerName || d.name), stage: d.stage, daysPreview: days });
    stageAge[d.stage] = (stageAge[d.stage] || 0) + days;
  });
  staleDealsPreview.sort((a, b) => b.daysPreview - a.daysPreview);
  const oldestStagePreview = Object.keys(stageAge).sort((a, b) => stageAge[b] - stageAge[a])[0] || 'none';
  return {
    bucketsPreview: buckets,
    staleDealsPreview: staleDealsPreview.slice(0, 20),
    staleCountPreview: staleDealsPreview.length,
    oldestStagePreview,
  };
}
module.exports = { aging };
