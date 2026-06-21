// lib/revenueOps/revenueRisk.js — deterministic revenue risk preview. Read-only.
'use strict';

function revenueRisk(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const reasons = [];
  const mitigationPreview = [];
  let score = 10;

  const highValueStuck = list.filter((d) => ['high', 'enterprise'].includes(d.valueBand) && (Number(d.lastContactDays) || 0) > 14 && !['Won Preview', 'Lost Preview'].includes(d.stage));
  const paymentPending = list.filter((d) => d.stage === 'Payment Pending');
  const complaint = list.filter((d) => d.complaintRisk);
  const dormant = list.filter((d) => d.stage === 'Dormant / Nurture');

  if (highValueStuck.length) { score += highValueStuck.length * 18; reasons.push(highValueStuck.length + ' high-value opportunities stuck (preview)'); mitigationPreview.push('Prioritize high-value warm deals; schedule manual review.'); }
  if (paymentPending.length) { score += paymentPending.length * 12; reasons.push(paymentPending.length + ' payment-pending deals (preview)'); mitigationPreview.push('Review payment-pending deals manually; send utility reminder preview.'); }
  if (complaint.length) { score += complaint.length * 12; reasons.push(complaint.length + ' complaint-risk deals (preview)'); mitigationPreview.push('Add human review for complaint-risk deals.'); }
  if (dormant.length) { score += dormant.length * 6; reasons.push(dormant.length + ' dormant deals (preview)'); mitigationPreview.push('Move stale opportunities to nurture preview.'); }

  score = Math.max(0, Math.min(100, score));
  let revenueRiskLevel = 'Low';
  if (score >= 75) revenueRiskLevel = 'Critical';
  else if (score >= 50) revenueRiskLevel = 'High';
  else if (score >= 25) revenueRiskLevel = 'Medium';
  if (!reasons.length) reasons.push('No major revenue risk detected in preview.');
  return { revenueRiskScore: score, revenueRiskLevel, reasons, mitigationPreview };
}
module.exports = { revenueRisk };
