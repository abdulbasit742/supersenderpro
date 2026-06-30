// lib/productAnalytics/index.js
// Orchestrator: pull order line items out of the CRM interaction log and run the
// product engine. Reads storeCRM only; rebuilds nothing. Order interactions are
// written by storeCRM.recordOrder with { product, amount } fields.

const engine = require('./engine');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

function collectOrders(storeId) {
  if (!storeCRM) return [];
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const orders = [];
  for (const c of customers) {
    if (!c.phone) continue;
    const interactions = storeCRM.getCustomerInteractions(storeId, c.phone, 500) || [];
    for (const i of interactions) {
      if (i.type !== 'order') continue;
      // product may be on i.product or i.productName depending on the caller.
      const product = i.product || i.productName || null;
      if (Number(i.amount) > 0) orders.push({ product, amount: Number(i.amount), phone: c.phone, ts: i.ts });
    }
    // Fallback: customer profile lists preferredProducts but no line items.
    if (!interactions.some((i) => i.type === 'order') && Array.isArray(c.preferredProducts) && c.preferredProducts.length && Number(c.totalSpent) > 0) {
      const each = Number(c.totalSpent) / c.preferredProducts.length;
      for (const pr of c.preferredProducts) orders.push({ product: pr, amount: each, phone: c.phone, ts: c.lastContact || c.firstContact });
    }
  }
  return orders;
}

function buildSnapshot(storeId = 'default_store', now = Date.now()) {
  const orders = collectOrders(storeId);
  const result = engine.analyze(orders, { now });
  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    summary: result.summary,
    products: result.products,
    stars: result.products.filter((p) => p.class === 'star'),
    slowMovers: result.products.filter((p) => p.class === 'slow_mover' || p.class === 'dormant'),
  };
}

function buildAllSnapshot(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch {}
  const stores = ids.map((id) => buildSnapshot(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot, collectOrders };
