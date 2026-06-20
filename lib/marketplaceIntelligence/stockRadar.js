'use strict';
/**
 * stockRadar.js — track stock signals per SKU (available/low/out) and changes.
 */

function summarize(state) {
  const bySku = {};
  for (const e of Object.values(state.entities)) {
    if (e.type !== 'stock') continue;
    const sku = e.metadataSafe?.sku;
    if (!sku) continue;
    (bySku[sku] = bySku[sku] || []).push({ signal: e.metadataSafe?.signal, ts: e.lastSeenAt, seller: e.metadataSafe?.sellerId });
  }
  return Object.entries(bySku).map(([sku, pts]) => {
    pts.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    return { sku, latestSignal: pts[0]?.signal || 'unknown', updates: pts.length, lastUpdate: pts[0]?.ts };
  });
}

/** Low-stock or out-of-stock signals are opportunities for resellers. */
function lowStockOpportunities(state) {
  return summarize(state).filter(s => s.latestSignal === 'low' || s.latestSignal === 'out');
}

function detectChanges(state) {
  const bySku = {};
  for (const e of Object.values(state.entities)) {
    if (e.type !== 'stock') continue;
    const sku = e.metadataSafe?.sku; if (!sku) continue;
    (bySku[sku] = bySku[sku] || []).push({ signal: e.metadataSafe?.signal, ts: e.lastSeenAt });
  }
  const changes = [];
  for (const [sku, pts] of Object.entries(bySku)) {
    if (pts.length < 2) continue;
    pts.sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const prev = pts[pts.length - 2].signal, cur = pts[pts.length - 1].signal;
    if (prev !== cur) changes.push({ sku, from: prev, to: cur });
  }
  return changes;
}

module.exports = { summarize, lowStockOpportunities, detectChanges };
