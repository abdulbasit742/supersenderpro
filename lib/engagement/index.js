// lib/engagement/index.js
// Orchestrator over storeCRM. Builds one chronological timeline per customer and
// runs the engagement engine. Reads storeCRM only; rebuilds nothing.

const engine = require('./engine');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

function buildTimelines(storeId) {
  if (!storeCRM) return [];
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const timelines = [];
  for (const c of customers) {
    if (!c.phone) continue;
    const list = storeCRM.getCustomerInteractions(storeId, c.phone, 500) || [];
    if (list.length) timelines.push(list.map((i) => ({ ts: i.ts, type: i.type })));
  }
  return timelines;
}

function buildSnapshot(storeId = 'default_store', now = Date.now()) {
  const timelines = buildTimelines(storeId);
  const r = engine.analyze(timelines);
  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    summary: r.summary,
    latencyHistogram: r.latencyHistogram,
  };
}

function buildAllSnapshot(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch {}
  const stores = ids.map((id) => buildSnapshot(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot, buildTimelines };
