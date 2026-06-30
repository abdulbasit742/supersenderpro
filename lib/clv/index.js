// lib/clv/index.js
// Orchestrator over storeCRM. Reads customers, runs the CLV model, masks phones
// in the output. Rebuilds nothing.

const engine = require('./engine');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

function mask(phone) {
  const s = String(phone || '');
  return s.length > 5 ? s.slice(0, 4) + '****' + s.slice(-2) : '****';
}

function buildSnapshot(storeId = 'default_store', now = Date.now(), opts = {}) {
  const customers = storeCRM ? (storeCRM.getAllCustomers(storeId) || []) : [];
  const r = engine.analyze(customers, { now, horizonMonths: opts.horizonMonths || 12 });
  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    summary: r.summary,
    distribution: r.distribution,
    topCustomers: r.customers.slice(0, 50).map((c) => ({ ...c, phone: mask(c.phone) })),
  };
}

function buildAllSnapshot(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch {}
  const stores = ids.map((id) => buildSnapshot(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot };
