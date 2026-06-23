// lib/revenueOps/recommendationEngine.js — local, deterministic recommendations. No AI, no sends, no mutation.
'use strict';
const { scoreDeal } = require('./dealScoring');

function recommendations(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const recs = [];
  const add = (priority, action) => recs.push({ priority, action });

  const hot = list.filter((d) => scoreDeal(d).scoreLevel === 'Hot');
  const stale = list.filter((d) => (Number(d.lastContactDays) || 0) > 14 && !['Won Preview', 'Lost Preview'].includes(d.stage));
  const paymentPending = list.filter((d) => d.stage === 'Payment Pending');
  const unknownConsent = list.filter((d) => (d.consent || 'unknown') === 'unknown');
  const complaint = list.filter((d) => d.complaintRisk);
  const negotiation = list.filter((d) => d.stage === 'Negotiation');

  if (hot.length) add('high', 'Follow up ' + hot.length + ' hot lead(s) first.');
  if (paymentPending.length) add('high', 'Review ' + paymentPending.length + ' payment-pending deal(s) manually; use utility template for payment reminder preview.');
  if (complaint.length) add('high', 'Add human review for ' + complaint.length + ' complaint-risk deal(s).');
  if (stale.length) add('medium', 'Move ' + stale.length + ' stale opportunit(y/ies) to nurture preview.');
  if (negotiation.length) add('medium', 'Review stuck negotiation opportunities and clarify CTA to improve quote-to-win conversion.');
  if (unknownConsent.length) add('medium', 'Avoid marketing follow-up for ' + unknownConsent.length + ' lead(s) with unknown consent.');
  add('low', 'Prioritize high-value warm deals and reduce follow-up frequency for fatigue-risk leads.');
  return recs;
}
module.exports = { recommendations };
