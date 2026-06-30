// lib/basketAnalysis/index.js
// Orchestrator over storeCRM. Builds one basket per customer from the products
// they've purchased (order interactions' product field, with the profile's
// preferredProducts as a fallback), then runs the affinity engine.
//
// Honest caveat: the data has no per-ORDER line grouping, so we treat each
// CUSTOMER's set of purchased products as a basket. That surfaces real
// co-purchase affinity ("people who buy X tend to also buy Y"), which is exactly
// what cross-sell/bundle decisions need. When true order-level baskets land
// (Postgres), only collectBaskets() changes.

const engine = require('./engine');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

function collectBaskets(storeId) {
  if (!storeCRM) return [];
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const baskets = [];
  for (const c of customers) {
    if (!c.phone) continue;
    const items = new Set();
    const interactions = storeCRM.getCustomerInteractions(storeId, c.phone, 500) || [];
    for (const i of interactions) {
      if (i.type === 'order') {
        const p = i.product || i.productName;
        if (p) items.add(String(p).trim());
      }
    }
    // Fallback to the profile's preferredProducts if no line items recorded.
    if (!items.size && Array.isArray(c.preferredProducts)) {
      for (const p of c.preferredProducts) if (p) items.add(String(p).trim());
    }
    if (items.size) baskets.push(Array.from(items));
  }
  return baskets;
}

function buildSnapshot(storeId = 'default_store', now = Date.now()) {
  const baskets = collectBaskets(storeId);
  const r = engine.analyze(baskets, { minSupportCount: 2 });
  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    summary: r.summary,
    topPairs: r.pairs.slice(0, 50),
    recommendations: r.recommendations,
  };
}

function recommendFor(storeId = 'default_store', product) {
  const snap = buildSnapshot(storeId);
  return snap.recommendations[product] || [];
}

function buildAllSnapshot(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch {}
  const stores = ids.map((id) => buildSnapshot(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot, recommendFor, collectBaskets };
