'use strict';
/** sellerRanking.js — rank sellers by trust + activity + price competitiveness. */
const sellerProfiler = require('./sellerProfiler');
const priceRadar = require('./priceRadar');

function leaderboard(state, limit = 25) {
  const prices = Object.fromEntries(priceRadar.summarize(state).map(p => [p.sku, p]));
  const ranked = sellerProfiler.profiles(state).map(p => {
    // competitiveness: how often this seller is at/below avg for its skus
    let competitive = 0, considered = 0;
    p.skusOffered.forEach(sku => {
      const pr = prices[sku];
      if (pr && pr.avg) { considered++; if ((pr.latest || pr.avg) <= pr.avg) competitive++; }
    });
    const competitiveness = considered ? Math.round((competitive / considered) * 100) : null;
    const activity = Math.min(100, p.productsOffered * 8 + p.stockClaims * 4);
    const rankScore = Math.round(p.trustScore * 0.5 + activity * 0.3 + (competitiveness || 50) * 0.2);
    return { ...p, activityScore: activity, priceCompetitiveness: competitiveness, rankScore };
  }).sort((a, b) => b.rankScore - a.rankScore);
  return ranked.slice(0, limit);
}

module.exports = { leaderboard };
