'use strict';
/**
 * demandScoring.js — conversion potential for a buyer demand entity (rule-based).
 */
function scoreDemand(demand) {
  let score = 40;
  const reasons = [];
  const m = demand.metadataSafe || {};
  if (m.urgency === 'high') { score += 20; reasons.push('urgent'); }
  else if (m.urgency === 'medium') { score += 8; reasons.push('some urgency'); }
  if (m.quantity && m.quantity > 1) { score += 12; reasons.push('bulk quantity'); }
  if (m.budget) { score += 10; reasons.push('budget stated'); }
  if (m.sku && m.sku !== 'sku_unknown') { score += 8; reasons.push('specific product'); }
  if (m.hasLocation) { score += 5; reasons.push('location provided'); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold';
  return { score, band, reasons };
}
module.exports = { scoreDemand };
