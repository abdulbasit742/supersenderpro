'use strict';
/**
 * sellerProfiler.js — derive per-seller profiles from the graph (safe, masked).
 */
const trustScoring = require('./trustScoring');

function profiles(state) {
  const sellers = Object.values(state.entities).filter(e => e.type === 'seller');
  return sellers.map(s => {
    const offers = state.relationships.filter(r => r.type === 'seller_offers_product' && r.from === s.id);
    const stock = state.relationships.filter(r => r.type === 'seller_has_stock' && r.from === s.id);
    const priceChanges = state.relationships.filter(r => r.type === 'seller_price_changed' && r.from === s.id);
    const skus = new Set(offers.map(o => state.entities[o.to]?.metadataSafe?.sku).filter(Boolean));
    const ctx = { offerCount: offers.length, distinctSkus: skus.size, sources: (s.metadataSafe?.sources || []).length, repeatPriceChanges: priceChanges.length };
    const trust = trustScoring.scoreSeller(s, ctx);
    return {
      sellerId: s.id,
      sellerNameSafe: s.label,
      city: s.metadataSafe?.city || null,
      productsOffered: offers.length,
      skusOffered: [...skus].slice(0, 25),
      stockClaims: stock.length,
      priceChanges: priceChanges.length,
      lastSeen: s.lastSeenAt,
      sources: s.metadataSafe?.sources || [],
      trustScore: trust.score,
      trustBand: trust.band,
      riskFlags: s.riskFlags || [],
      reasons: trust.reasons
    };
  });
}

module.exports = { profiles };
