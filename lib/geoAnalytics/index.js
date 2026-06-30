const engine = require('./engine');
let storeCRM = null; try { storeCRM = require('../storeCRM'); } catch {}
function buildSnapshot(storeId = 'default_store', now = Date.now()) { const customers = storeCRM ? (storeCRM.getAllCustomers(storeId) || []) : []; const r = engine.analyze(customers, { now }); return { storeId, generatedAt: new Date(now).toISOString(), summary: r.summary, regions: r.regions, opportunities: r.opportunities }; }
function buildAllSnapshot(now = Date.now()) { let ids = ['default_store']; try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch {} const stores = ids.map((id) => buildSnapshot(id, now)); return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null }; }
module.exports = { buildSnapshot, buildAllSnapshot };
