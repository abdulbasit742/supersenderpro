// lib/revenueOps/funnelAnalysis.js — deterministic sales funnel + drop-off preview. Read-only.
'use strict';

// Ordered funnel stages (Lost/Dormant handled separately).
const FUNNEL = ['New Lead', 'Contacted', 'Qualified', 'Demo / Discussion', 'Quotation Sent', 'Negotiation', 'Payment Pending', 'Won Preview'];

function funnel(deals) {
  const list = Array.isArray(deals) ? deals : [];
  // cumulative: a deal at stage i has passed all earlier stages
  const idx = {}; FUNNEL.forEach((s, i) => { idx[s] = i; });
  const reached = FUNNEL.map(() => 0);
  list.forEach((d) => {
    const i = idx[d.stage];
    if (i === undefined) return;
    for (let k = 0; k <= i; k++) reached[k] += 1;
  });
  const funnelPreview = FUNNEL.map((s, i) => {
    const fromPrev = i === 0 ? 100 : (reached[i - 1] > 0 ? Math.round((reached[i] / reached[i - 1]) * 100) : 0);
    return { stage: s, reachedCountPreview: reached[i], conversionFromPrevPreview: fromPrev, dropOffPreview: i === 0 ? 0 : Math.max(0, 100 - fromPrev) };
  });
  let biggest = { stage: 'none', dropOffPreview: 0 };
  funnelPreview.forEach((f) => { if (f.dropOffPreview > biggest.dropOffPreview) biggest = { stage: f.stage, dropOffPreview: f.dropOffPreview }; });
  return { funnelPreview, biggestDropOffStagePreview: biggest.stage, biggestDropOffPercentPreview: biggest.dropOffPreview };
}
module.exports = { funnel };
