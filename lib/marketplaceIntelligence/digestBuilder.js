'use strict';
/** digestBuilder.js — compact daily market digest (text + structured). */
const sellerRanking = require('./sellerRanking');
const buyerProfiler = require('./buyerProfiler');
const priceRadar = require('./priceRadar');
const stockRadar = require('./stockRadar');
const opportunityDetector = require('./opportunityDetector');

function build(state) {
  const sellers = sellerRanking.leaderboard(state, 5);
  const buyers = buyerProfiler.profiles(state).sort((a, b) => b.conversionScore - a.conversionScore).slice(0, 5);
  const priceChanges = priceRadar.detectChanges(state);
  const stockChanges = stockRadar.detectChanges(state);
  const opps = opportunityDetector.detect(state);
  const structured = {
    generatedAt: new Date().toISOString(),
    topSellers: sellers.map(s => ({ seller: s.sellerNameSafe, trust: s.trustScore })),
    topBuyers: buyers.map(b => ({ buyer: b.buyerNameSafe, score: b.conversionScore })),
    priceChanges: priceChanges.length,
    stockChanges: stockChanges.length,
    opportunities: opps.length,
    highRisk: Object.values(state.entities).filter(e => (e.riskFlags || []).length).length
  };
  const text = [
    '📊 *Marketplace Digest*',
    `Top sellers: ${structured.topSellers.map(s => `${s.seller}(${s.trust})`).join(', ') || '—'}`,
    `Hot buyers: ${structured.topBuyers.map(b => `${b.buyer}(${b.score})`).join(', ') || '—'}`,
    `Price changes: ${structured.priceChanges} | Stock changes: ${structured.stockChanges}`,
    `Opportunities: ${structured.opportunities} | High-risk posts: ${structured.highRisk}`,
    'Dry-run only — koi live action nahi liya gaya.'
  ].join('\n');
  return { text, structured };
}

module.exports = { build };
