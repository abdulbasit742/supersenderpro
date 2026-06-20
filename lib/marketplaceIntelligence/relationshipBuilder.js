'use strict';
/**
 * relationshipBuilder.js — turn one normalized marketplace signal into graph
 * entities + relationships. Pure: mutates the passed `state`, returns a summary.
 *
 * Normalized signal shape (produced by adapters):
 *   {
 *     intent: 'offer'|'demand'|'unknown',
 *     actorIdMasked, actorNameSafe, actorCity,
 *     productLabel, sku, normalizedLabel,
 *     price: {value,currency}|null, stockSignal, quantity, budget, urgency,
 *     sourceType, sourceId, sourceName,
 *     riskFlags[], confidence, safeSnippet
 *   }
 */

const graph = require('./entityGraph');

function build(state, sig) {
  const out = { entities: [], relationships: [] };
  const conf = sig.confidence != null ? sig.confidence : 0.6;

  // source entity
  if (sig.sourceId) {
    graph.upsertEntity(state, {
      id: 'source_' + sig.sourceId, type: 'source', label: sig.sourceName || sig.sourceType || sig.sourceId,
      sourceType: sig.sourceType, sourceId: sig.sourceId, sourceName: sig.sourceName, confidence: conf,
      metadataSafe: { kind: sig.sourceType }
    });
  }

  // product + sku
  let skuId = null;
  if (sig.sku) {
    skuId = sig.sku;
    graph.upsertEntity(state, { id: skuId, type: 'sku', label: sig.normalizedLabel || sig.productLabel || sig.sku, confidence: conf, sourceType: sig.sourceType, metadataSafe: { sku: sig.sku, normalizedLabel: sig.normalizedLabel } });
    if (!state.skus.find(s => s.sku === sig.sku)) state.skus.push({ sku: sig.sku, label: sig.productLabel, normalizedLabel: sig.normalizedLabel });
    const productId = 'product_' + sig.sku;
    graph.upsertEntity(state, { id: productId, type: 'product', label: sig.productLabel || sig.normalizedLabel || sig.sku, confidence: conf, metadataSafe: { sku: sig.sku } });
    graph.addRelationship(state, { type: 'product_has_sku', from: productId, to: skuId, confidence: conf });
  }

  // price entity + relationship — ONLY from seller offers (market price points).
  // Buyer budgets stay in buyer metadata and must not pollute the price radar.
  if (sig.price && skuId && sig.intent === 'offer') {
    const priceId = `price_${sig.sku}_${Date.now()}`;
    graph.upsertEntity(state, { id: priceId, type: 'price', label: `${sig.price.value} ${sig.price.currency}`, confidence: conf, sourceType: sig.sourceType, metadataSafe: { sku: sig.sku, value: sig.price.value, currency: sig.price.currency, sellerId: sig.intent === 'offer' ? sig.actorIdMasked : undefined } });
    graph.addRelationship(state, { type: 'sku_has_price', from: skuId, to: priceId, confidence: conf, metadataSafe: { value: sig.price.value } });
  }

  // stock entity + relationship
  if (sig.stockSignal && skuId) {
    const stockId = `stock_${sig.sku}_${Date.now()}`;
    graph.upsertEntity(state, { id: stockId, type: 'stock', label: `${sig.sku}:${sig.stockSignal}`, confidence: conf, metadataSafe: { sku: sig.sku, signal: sig.stockSignal, sellerId: sig.actorIdMasked } });
  }

  // actor (seller/buyer) + intent relationships
  if (sig.intent === 'offer' && sig.actorIdMasked) {
    const sellerId = 'seller_' + sig.actorIdMasked;
    const seller = graph.upsertEntity(state, { id: sellerId, type: 'seller', label: sig.actorNameSafe || 'Seller', confidence: conf, sourceType: sig.sourceType, sourceId: sig.sourceId, sourceName: sig.sourceName, riskFlags: sig.riskFlags || [], metadataSafe: { city: sig.actorCity, hasLocation: !!sig.actorCity, sources: addSource(state, sellerId, sig.sourceId) } });
    if (skuId) {
      graph.addRelationship(state, { type: 'seller_offers_product', from: sellerId, to: skuId, confidence: conf });
      const offerId = `offer_${sig.actorIdMasked}_${sig.sku}`;
      graph.upsertEntity(state, { id: offerId, type: 'offer', label: `${seller.label} → ${sig.normalizedLabel || sig.sku}`, confidence: conf, metadataSafe: { sku: sig.sku, sellerId, price: sig.price?.value, snippet: sig.safeSnippet } });
      if (sig.sourceId) graph.addRelationship(state, { type: 'source_reported_offer', from: 'source_' + sig.sourceId, to: offerId, confidence: conf });
    }
    if (sig.stockSignal && skuId) graph.addRelationship(state, { type: 'seller_has_stock', from: sellerId, to: skuId, confidence: conf, metadataSafe: { signal: sig.stockSignal } });
    if (sig.price && skuId) graph.addRelationship(state, { type: 'seller_price_changed', from: sellerId, to: skuId, confidence: conf, metadataSafe: { value: sig.price.value } });
  } else if (sig.intent === 'demand' && sig.actorIdMasked) {
    const buyerId = 'buyer_' + sig.actorIdMasked;
    graph.upsertEntity(state, { id: buyerId, type: 'buyer', label: sig.actorNameSafe || 'Buyer', confidence: conf, sourceType: sig.sourceType, metadataSafe: { city: sig.actorCity, hasLocation: !!sig.actorCity, quantity: sig.quantity, budget: sig.budget, urgency: sig.urgency } });
    if (skuId) {
      graph.addRelationship(state, { type: 'buyer_wants_product', from: buyerId, to: skuId, confidence: conf });
      const demandId = `demand_${sig.actorIdMasked}_${sig.sku}`;
      graph.upsertEntity(state, { id: demandId, type: 'demand', label: `${sig.normalizedLabel || sig.sku} wanted`, confidence: conf, metadataSafe: { sku: sig.sku, buyerId, quantity: sig.quantity, budget: sig.budget, urgency: sig.urgency, snippet: sig.safeSnippet } });
      if (sig.sourceId) graph.addRelationship(state, { type: 'source_reported_demand', from: 'source_' + sig.sourceId, to: demandId, confidence: conf });
    }
  }

  // risk alert entity
  if ((sig.riskFlags || []).length) {
    const alertId = `alert_${sig.actorIdMasked || 'src'}_${(sig.riskFlags || []).join('_')}`.slice(0, 80);
    graph.upsertEntity(state, { id: alertId, type: 'alert', label: 'Risk: ' + sig.riskFlags.join(', '), confidence: conf, riskFlags: sig.riskFlags, metadataSafe: { sku: sig.sku, snippet: sig.safeSnippet } });
  }

  return out;
}

// helper: track distinct sources per seller without storing raw ids beyond masked
function addSource(state, sellerId, sourceId) {
  const cur = state.entities[sellerId]?.metadataSafe?.sources || [];
  if (sourceId && !cur.includes(sourceId)) cur.push(sourceId);
  return cur.slice(0, 20);
}

module.exports = { build };
