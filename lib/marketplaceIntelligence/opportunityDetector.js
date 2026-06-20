'use strict';
/**
 * opportunityDetector.js — combine price + stock + demand signals into
 * actionable, dry-run-safe marketplace opportunities.
 */

const priceRadar = require('./priceRadar');
const stockRadar = require('./stockRadar');

function detect(state) {
  const opportunities = [];
  const prices = priceRadar.summarize(state);
  const priceBySku = Object.fromEntries(prices.map(p => [p.sku, p]));

  // 1. Profitable spread: ecommerce price vs lowest seller price for same sku
  for (const e of Object.values(state.entities)) {
    if (e.type !== 'ecommerce_product') continue;
    const sku = e.metadataSafe?.sku;
    const ecoPrice = Number(e.metadataSafe?.value);
    const p = priceBySku[sku];
    if (sku && p && Number.isFinite(ecoPrice) && p.min && ecoPrice > p.min) {
      const spread = ecoPrice - p.min;
      const marginPct = Math.round((spread / ecoPrice) * 100);
      if (marginPct >= 10) opportunities.push({ type: 'profitable_resale', sku, buyAt: p.min, sellAt: ecoPrice, spread, marginPct, confidence: 0.7 });
    }
  }

  // 2. Low-stock demand: low/out stock + recent buyer demand for same sku
  const lowStock = new Set(stockRadar.lowStockOpportunities(state).map(s => s.sku));
  const demandSkus = {};
  for (const e of Object.values(state.entities)) {
    if (e.type === 'demand' && e.metadataSafe?.sku) demandSkus[e.metadataSafe.sku] = (demandSkus[e.metadataSafe.sku] || 0) + 1;
  }
  for (const sku of lowStock) {
    if (demandSkus[sku]) opportunities.push({ type: 'low_stock_high_demand', sku, demandCount: demandSkus[sku], confidence: 0.65 });
  }

  // 3. Hot demand: many buyer requests, few sellers
  const sellerCountBySku = {};
  for (const r of state.relationships) {
    if (r.type === 'seller_offers_product') {
      const sku = state.entities[r.to]?.metadataSafe?.sku || r.to;
      (sellerCountBySku[sku] = sellerCountBySku[sku] || new Set()).add(r.from);
    }
  }
  for (const [sku, count] of Object.entries(demandSkus)) {
    const sellers = sellerCountBySku[sku]?.size || 0;
    if (count >= 3 && sellers <= 1) opportunities.push({ type: 'hot_demand_low_supply', sku, demandCount: count, sellerCount: sellers, confidence: 0.75 });
  }

  // 4. Price drop = good buy
  for (const c of priceRadar.detectChanges(state)) {
    if (c.direction === 'drop') opportunities.push({ type: 'price_drop_buy', sku: c.sku, fromPrice: c.fromPrice, toPrice: c.toPrice, changePct: c.changePct, confidence: 0.6 });
  }

  return opportunities;
}

module.exports = { detect };
