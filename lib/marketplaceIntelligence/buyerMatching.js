'use strict';
/** buyerMatching.js — match buyer demand to best seller offers for the same SKU. */
const sellerProfiler = require('./sellerProfiler');
const priceRadar = require('./priceRadar');

/** For a given sku, find candidate sellers sorted by trust + price. */
function matchSellersForSku(state, sku, limit = 5) {
  const prices = Object.fromEntries(priceRadar.summarize(state).map(p => [p.sku, p]));
  const sellers = sellerProfiler.profiles(state).filter(s => s.skusOffered.includes(sku));
  return sellers
    .map(s => ({ sellerId: s.sellerId, sellerNameSafe: s.sellerNameSafe, trustScore: s.trustScore, trustBand: s.trustBand, city: s.city, skuAvgPrice: prices[sku]?.avg || null }))
    .sort((a, b) => b.trustScore - a.trustScore || (a.skuAvgPrice || 1e12) - (b.skuAvgPrice || 1e12))
    .slice(0, limit);
}

/** For each open demand, attach the best matching sellers. */
function matchAll(state, limit = 50) {
  const demands = Object.values(state.entities).filter(e => e.type === 'demand');
  return demands.slice(0, limit).map(d => {
    const sku = d.metadataSafe?.sku;
    return { demandId: d.id, sku, label: d.label, buyerId: d.metadataSafe?.buyerId || null, matches: sku ? matchSellersForSku(state, sku) : [] };
  });
}

module.exports = { matchSellersForSku, matchAll };
