'use strict';
/**
 * trustScoring.js — compute a 0..100 trust score for a seller entity (rule-based, dry-run).
 * No auto-ban. Score is advisory only.
 */
function scoreSeller(seller, ctx = {}) {
  let score = 50;
  const reasons = [];
  const meta = seller.metadataSafe || {};
  const offers = ctx.offerCount || meta.offerCount || 0;
  if (offers >= 5) { score += 12; reasons.push('consistent offers'); }
  if ((ctx.distinctSkus || meta.distinctSkus || 0) >= 3) { score += 6; reasons.push('varied catalog'); }
  if (meta.hasLocation) { score += 6; reasons.push('location provided'); }
  if ((ctx.sources || 0) >= 2) { score += 6; reasons.push('seen in multiple sources'); }
  const flags = seller.riskFlags || [];
  score -= flags.length * 12;
  flags.forEach(f => reasons.push('risk: ' + f));
  if ((ctx.repeatPriceChanges || 0) > 6) { score -= 8; reasons.push('erratic pricing'); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = score >= 70 ? 'trusted' : score >= 40 ? 'neutral' : 'watch';
  return { score, band, reasons };
}
module.exports = { scoreSeller };
