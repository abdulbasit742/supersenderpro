'use strict';
/**
 * buyerProfiler.js — derive per-buyer demand profiles from the graph (safe, masked).
 */
const demandScoring = require('./demandScoring');

function profiles(state) {
  const buyers = Object.values(state.entities).filter(e => e.type === 'buyer');
  return buyers.map(b => {
    const wants = state.relationships.filter(r => r.type === 'buyer_wants_product' && r.from === b.id);
    const skus = new Set(wants.map(w => state.entities[w.to]?.metadataSafe?.sku).filter(Boolean));
    // Conversion potential from the best related demand entity
    const relatedDemands = Object.values(state.entities).filter(e => e.type === 'demand' && e.metadataSafe?.buyerId === b.id);
    const best = relatedDemands.map(d => demandScoring.scoreDemand(d)).sort((a, c) => c.score - a.score)[0] || { score: 40, band: 'cold', reasons: [] };
    return {
      buyerId: b.id,
      buyerNameSafe: b.label,
      city: b.metadataSafe?.city || null,
      requestedSkus: [...skus].slice(0, 25),
      requests: wants.length,
      quantity: b.metadataSafe?.quantity || null,
      budget: b.metadataSafe?.budget || null,
      urgency: b.metadataSafe?.urgency || 'unknown',
      conversionScore: best.score,
      conversionBand: best.band,
      followUpRecommendation: best.band === 'hot' ? 'Contact via existing CRM follow-up (manual)' : 'Monitor demand',
      lastSeen: b.lastSeenAt
    };
  });
}

module.exports = { profiles };
