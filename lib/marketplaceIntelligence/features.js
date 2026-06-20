'use strict';
/**
 * features.js — additional Marketplace Intelligence analytics (read-only, dry-run).
 * All functions are pure over the graph `state` (from store.read()).
 */

const priceRadar = require('./priceRadar');
const stockRadar = require('./stockRadar');

const CATEGORY_KEYWORDS = {
  mobiles: ['iphone', 'samsung', 'redmi', 'oppo', 'vivo', 'mobile', 'phone', 'smartphone', 'tecno', 'infinix'],
  laptops: ['laptop', 'macbook', 'notebook', 'thinkpad', 'dell', 'hp', 'lenovo'],
  electronics: ['tv', 'led', 'charger', 'earbuds', 'headphone', 'speaker', 'watch', 'powerbank', 'cable'],
  fashion: ['shirt', 'shoes', 'kurta', 'lawn', 'dress', 'jeans', 'abaya', 'bag', 'jacket'],
  beauty: ['cream', 'serum', 'makeup', 'lipstick', 'perfume', 'skincare', 'foundation'],
  home: ['sofa', 'bed', 'table', 'chair', 'kitchen', 'crockery', 'blanket'],
  grocery: ['rice', 'oil', 'flour', 'sugar', 'tea', 'masala', 'ghee'],
  stickers: ['sticker', 'wallpaper', 'theme'],
  education: ['course', 'book', 'scholarship', 'notes', 'guide']
};

function classify(label) {
  const t = String(label || '').toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => t.includes(w))) return cat;
  }
  return 'general';
}

function withinHours(ts, hours) { return Date.now() - new Date(ts).getTime() <= hours * 36e5; }

/** 1. Trending SKUs by activity velocity in a time window. */
function trendingSkus(state, hours = 24, limit = 15) {
  const counts = {};
  for (const e of Object.values(state.entities)) {
    if ((e.type === 'offer' || e.type === 'demand') && withinHours(e.lastSeenAt, hours)) {
      const sku = e.metadataSafe?.sku; if (!sku) continue;
      counts[sku] = (counts[sku] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([sku, count]) => ({ sku, activity: count, windowHours: hours }))
    .sort((a, b) => b.activity - a.activity).slice(0, limit);
}

/** 2. City heatmap: seller/buyer/offer counts per city. */
function cityHeatmap(state) {
  const map = {};
  for (const e of Object.values(state.entities)) {
    const city = e.metadataSafe?.city; if (!city) continue;
    map[city] = map[city] || { city, sellers: 0, buyers: 0 };
    if (e.type === 'seller') map[city].sellers++;
    if (e.type === 'buyer') map[city].buyers++;
  }
  return Object.values(map).sort((a, b) => (b.sellers + b.buyers) - (a.sellers + a.buyers));
}

/** 3. Category breakdown of SKUs + demand. */
function categories(state) {
  const map = {};
  for (const s of state.skus) {
    const cat = classify(s.label || s.normalizedLabel || s.sku);
    map[cat] = map[cat] || { category: cat, skus: 0, demand: 0 };
    map[cat].skus++;
  }
  for (const e of Object.values(state.entities)) {
    if (e.type === 'demand') { const cat = classify(e.label); map[cat] = map[cat] || { category: cat, skus: 0, demand: 0 }; map[cat].demand++; }
  }
  return Object.values(map).sort((a, b) => (b.skus + b.demand) - (a.skus + a.demand));
}

/** 4. Price history timeline for a SKU. */
function priceHistory(state, sku) {
  return Object.values(state.entities)
    .filter(e => e.type === 'price' && e.metadataSafe?.sku === sku)
    .map(e => ({ value: e.metadataSafe.value, currency: e.metadataSafe.currency, ts: e.lastSeenAt }))
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

/** 5. Simple demand forecast: trend from recent vs older demand counts. */
function demandForecast(state, sku) {
  const events = Object.values(state.entities).filter(e => e.type === 'demand' && e.metadataSafe?.sku === sku);
  const recent = events.filter(e => withinHours(e.lastSeenAt, 24)).length;
  const older = events.filter(e => !withinHours(e.lastSeenAt, 24) && withinHours(e.lastSeenAt, 72)).length;
  const trend = recent > older ? 'rising' : recent < older ? 'falling' : 'stable';
  return { sku, recent24h: recent, prev48h: older, trend };
}

/** 6. Competitor price index per SKU (100 = market avg). */
function competitorPriceIndex(state) {
  const prices = priceRadar.summarize(state);
  const out = [];
  for (const p of prices) {
    if (!p.avg) continue;
    out.push({ sku: p.sku, avg: p.avg, latest: p.latest, index: Math.round((p.latest / p.avg) * 100), cheaperThanAvg: p.latest <= p.avg });
  }
  return out;
}

/** 7. Best time to buy heuristic. */
function bestTimeToBuy(state, sku) {
  const p = priceRadar.summarize(state).find(x => x.sku === sku);
  if (!p) return { sku, advice: 'no_data' };
  const advice = p.latest <= p.min * 1.05 ? 'buy_now' : p.latest >= p.avg * 1.1 ? 'wait_overpriced' : 'fair';
  return { sku, latest: p.latest, min: p.min, avg: p.avg, advice };
}

/** 8. Negotiation helper: target/fair/walkaway prices. */
function negotiation(state, sku) {
  const p = priceRadar.summarize(state).find(x => x.sku === sku);
  if (!p) return { sku, advice: 'no_data' };
  return { sku, target: p.min, fair: p.avg, walkAwayAbove: Math.round(p.avg * 1.1), currency: p.currency };
}

/** 9. Bundle opportunities: SKUs co-requested by the same buyer. */
function bundleOpportunities(state) {
  const byBuyer = {};
  for (const r of state.relationships) {
    if (r.type === 'buyer_wants_product') (byBuyer[r.from] = byBuyer[r.from] || new Set()).add(r.to);
  }
  const pairCounts = {};
  for (const skus of Object.values(byBuyer)) {
    const arr = [...skus];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      const key = [arr[i], arr[j]].sort().join(' + ');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }
  }
  return Object.entries(pairCounts).filter(([, c]) => c >= 2).map(([pair, count]) => ({ pair, buyers: count })).sort((a, b) => b.buyers - a.buyers);
}

/** 10. Stockout risk: low/out stock + active demand. */
function stockoutRisk(state) {
  const low = new Map(stockRadar.summarize(state).map(s => [s.sku, s.latestSignal]));
  const demand = {};
  for (const e of Object.values(state.entities)) if (e.type === 'demand' && e.metadataSafe?.sku) demand[e.metadataSafe.sku] = (demand[e.metadataSafe.sku] || 0) + 1;
  const out = [];
  for (const [sku, sig] of low) {
    if ((sig === 'low' || sig === 'out') && demand[sku]) out.push({ sku, signal: sig, demand: demand[sku], risk: sig === 'out' ? 'high' : 'medium' });
  }
  return out.sort((a, b) => b.demand - a.demand);
}

/** 11. Duplicate/repeat offers per seller+sku (spam signal). */
function duplicateOffers(state, threshold = 4) {
  const rel = state.relationships.filter(r => r.type === 'seller_offers_product');
  return rel.filter(r => (r.count || 1) >= threshold).map(r => ({ sellerId: r.from, sku: state.entities[r.to]?.metadataSafe?.sku || r.to, repeatCount: r.count }));
}

/** 12. Demand–supply gap per SKU. */
function demandSupplyGap(state) {
  const demand = {}, supply = {};
  for (const e of Object.values(state.entities)) if (e.type === 'demand' && e.metadataSafe?.sku) demand[e.metadataSafe.sku] = (demand[e.metadataSafe.sku] || 0) + 1;
  for (const r of state.relationships) if (r.type === 'seller_offers_product') {
    const sku = state.entities[r.to]?.metadataSafe?.sku || r.to;
    (supply[sku] = supply[sku] || new Set()).add(r.from);
  }
  const skus = new Set([...Object.keys(demand), ...Object.keys(supply)]);
  return [...skus].map(sku => ({ sku, demand: demand[sku] || 0, sellers: supply[sku]?.size || 0, gap: (demand[sku] || 0) - (supply[sku]?.size || 0) }))
    .sort((a, b) => b.gap - a.gap);
}

/** 13. Price anomalies: points deviating > pct from SKU avg. */
function priceAnomalies(state, pct = 25) {
  const avgBySku = Object.fromEntries(priceRadar.summarize(state).map(p => [p.sku, p.avg]));
  const out = [];
  for (const e of Object.values(state.entities)) {
    if (e.type !== 'price') continue;
    const sku = e.metadataSafe?.sku, v = e.metadataSafe?.value, avg = avgBySku[sku];
    if (!avg || !v) continue;
    const dev = Math.round(((v - avg) / avg) * 100);
    if (Math.abs(dev) >= pct) out.push({ sku, value: v, avg, deviationPct: dev, ts: e.lastSeenAt });
  }
  return out.sort((a, b) => Math.abs(b.deviationPct) - Math.abs(a.deviationPct));
}

/** 14. Price-drop leaders (biggest recent drops). */
function priceDropLeaders(state, limit = 10) {
  return priceRadar.detectChanges(state, 1).filter(c => c.direction === 'drop')
    .sort((a, b) => a.changePct - b.changePct).slice(0, limit);
}

/** 15. Market summary KPIs. */
function marketSummary(state) {
  const prices = priceRadar.summarize(state);
  const gap = demandSupplyGap(state);
  return {
    skusWithPrices: prices.length,
    avgSellersPerSku: prices.length ? Math.round((prices.reduce((a, p) => a + p.sellerCount, 0) / prices.length) * 10) / 10 : 0,
    underservedSkus: gap.filter(g => g.gap > 0).length,
    oversuppliedSkus: gap.filter(g => g.gap < 0).length,
    categories: categories(state).length,
    cities: cityHeatmap(state).length
  };
}

module.exports = {
  classify, trendingSkus, cityHeatmap, categories, priceHistory, demandForecast,
  competitorPriceIndex, bestTimeToBuy, negotiation, bundleOpportunities, stockoutRisk,
  duplicateOffers, demandSupplyGap, priceAnomalies, priceDropLeaders, marketSummary,
  CATEGORY_KEYWORDS
};
