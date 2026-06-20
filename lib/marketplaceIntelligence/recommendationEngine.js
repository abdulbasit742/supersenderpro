'use strict';
/**
 * recommendationEngine.js — rule-based, dry-run marketplace recommendations.
 * Produces "next action" suggestions; never executes them.
 */
const opportunityDetector = require('./opportunityDetector');
const sellerRanking = require('./sellerRanking');
const buyerMatching = require('./buyerMatching');
const priceRadar = require('./priceRadar');
const stockRadar = require('./stockRadar');

function generate(state) {
  const recs = [];
  const push = (r) => recs.push({ id: 'rec_' + recs.length + '_' + Date.now().toString(36), dryRun: true, ...r });

  // best seller per open demand
  for (const m of buyerMatching.matchAll(state, 20)) {
    if (m.matches.length) push({ type: 'best_seller_for_buyer', sku: m.sku, demandId: m.demandId, action: 'notify_admin', suggestion: `Connect buyer to ${m.matches[0].sellerNameSafe} (trust ${m.matches[0].trustScore})`, confidence: 0.7 });
  }
  // opportunities -> post drafts
  for (const o of opportunityDetector.detect(state)) {
    if (o.type === 'hot_demand_low_supply') push({ type: 'channel_post_recommendation', sku: o.sku, action: 'create_channel_post_draft', suggestion: `High demand, low supply for ${o.sku} — draft a sourcing/sale post`, confidence: o.confidence });
    if (o.type === 'profitable_resale') push({ type: 'profitable_resale', sku: o.sku, action: 'create_order_draft', suggestion: `Buy ~${o.buyAt}, list ~${o.sellAt} (margin ${o.marginPct}%)`, confidence: o.confidence });
    if (o.type === 'low_stock_high_demand') push({ type: 'low_stock_opportunity', sku: o.sku, action: 'create_social_post_draft', suggestion: `Low stock + ${o.demandCount} buyers for ${o.sku} — urgency post`, confidence: o.confidence });
    if (o.type === 'price_drop_buy') push({ type: 'price_change_alert', sku: o.sku, action: 'notify_admin', suggestion: `Price dropped ${o.changePct}% on ${o.sku} (now ${o.toPrice})`, confidence: o.confidence });
  }
  // price spikes
  for (const c of priceRadar.detectChanges(state)) {
    if (c.direction === 'spike') push({ type: 'price_change_alert', sku: c.sku, action: 'notify_admin', suggestion: `Price spike ${c.changePct}% on ${c.sku}`, confidence: 0.6 });
  }
  // stock changes
  for (const c of stockRadar.detectChanges(state)) {
    push({ type: 'stock_update', sku: c.sku, action: 'notify_admin', suggestion: `Stock ${c.from} → ${c.to} on ${c.sku}`, confidence: 0.55 });
  }
  // suspicious sellers
  for (const s of sellerRanking.leaderboard(state, 100)) {
    if ((s.riskFlags || []).length) push({ type: 'suspicious_seller_review', sellerId: s.sellerId, action: 'notify_admin', suggestion: `Review ${s.sellerNameSafe}: ${s.riskFlags.join(', ')}`, confidence: 0.5 });
  }
  return recs;
}

module.exports = { generate };
