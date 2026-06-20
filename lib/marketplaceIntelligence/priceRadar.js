'use strict';
/**
 * priceRadar.js — track latest/min/max/avg price per SKU and detect drops/spikes.
 * Operates over price entities + sku_has_price relationships stored in the graph.
 */

/** Build a price summary per SKU from price-point history kept in metadataSafe. */
function summarize(state) {
  const out = {};
  for (const e of Object.values(state.entities)) {
    if (e.type !== 'price') continue;
    const sku = e.metadataSafe?.sku;
    const value = Number(e.metadataSafe?.value);
    if (!sku || !Number.isFinite(value)) continue;
    if (!out[sku]) out[sku] = { sku, currency: e.metadataSafe?.currency || 'PKR', points: [], sellers: new Set() };
    out[sku].points.push({ value, ts: e.lastSeenAt, seller: e.metadataSafe?.sellerId });
    if (e.metadataSafe?.sellerId) out[sku].sellers.add(e.metadataSafe.sellerId);
  }
  return Object.values(out).map(s => {
    const vals = s.points.map(p => p.value).sort((a, b) => a - b);
    const latest = s.points.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts))[0];
    const min = vals[0], max = vals[vals.length - 1];
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    return { sku: s.sku, currency: s.currency, latest: latest?.value, min, max, avg, sellerCount: s.sellers.size, points: s.points.length };
  });
}

/** Detect price drops/spikes by comparing the two most recent points per SKU. */
function detectChanges(state, thresholdPct = 8) {
  const changes = [];
  const bySku = {};
  for (const e of Object.values(state.entities)) {
    if (e.type !== 'price') continue;
    const sku = e.metadataSafe?.sku; const value = Number(e.metadataSafe?.value);
    if (!sku || !Number.isFinite(value)) continue;
    (bySku[sku] = bySku[sku] || []).push({ value, ts: e.lastSeenAt });
  }
  for (const [sku, pts] of Object.entries(bySku)) {
    if (pts.length < 2) continue;
    pts.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const prev = pts[pts.length - 2].value, cur = pts[pts.length - 1].value;
    if (!prev) continue;
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) >= thresholdPct) {
      changes.push({ sku, direction: pct < 0 ? 'drop' : 'spike', fromPrice: prev, toPrice: cur, changePct: Math.round(pct * 10) / 10 });
    }
  }
  return changes;
}

module.exports = { summarize, detectChanges };
