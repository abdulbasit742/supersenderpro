// lib/analyticsInsights/dataSources.js
// Read-only adapters over the JSON data layer. Defensive by design: these never
// throw and always return a safe shape, so the analytics pipeline can run on
// partial or empty data without crashing the overnight batch.
//
// When the Postgres migration (roadmap Phase 1) lands, only the bodies here need
// to change — the engine and churn model consume plain arrays/objects and don't
// care where the data came from.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.ANALYTICS_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const CRM_DIR = path.join(DATA_DIR, 'store_crm');

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

// Discover every storeId that has a CRM file on disk (plus the default store).
function listStoreIds() {
  const ids = new Set(['default_store']);
  try {
    for (const f of fs.readdirSync(CRM_DIR)) {
      const m = f.match(/^(.*)_customers\.json$/);
      if (m) ids.add(m[1]);
    }
  } catch {
    /* no CRM dir yet — fine, return just the default */
  }
  return Array.from(ids);
}

function getCustomers(storeId) {
  const data = readJSON(path.join(CRM_DIR, `${storeId}_customers.json`), { customers: [] });
  return Array.isArray(data.customers) ? data.customers : [];
}

function getInteractions(storeId) {
  const data = readJSON(path.join(CRM_DIR, `${storeId}_interactions.json`), { interactions: [] });
  return Array.isArray(data.interactions) ? data.interactions : [];
}

// Subscription plans + per-user subscriptions (for MRR + subscription churn).
function getSubscriptions() {
  const raw = readJSON(path.join(DATA_DIR, 'subscription_plans.json'), {});
  const planPrices = {};
  for (const [tier, def] of Object.entries(raw || {})) {
    if (tier === 'users') continue;
    if (def && typeof def.price === 'number') planPrices[tier] = def.price;
  }
  // Fall back to the documented defaults if the file only holds users.
  if (!Object.keys(planPrices).length) {
    Object.assign(planPrices, { starter: 0, pro: 2000, unlimited: 5000 });
  }
  const users = (raw && raw.users) || {};
  return { planPrices, users };
}

// Payment transactions (best-effort: the stored shape is intentionally loose).
function getTransactions() {
  const raw = readJSON(path.join(DATA_DIR, 'txn_store.json'), { txns: [] });
  const list = Array.isArray(raw.txns) ? raw.txns : [];
  return list.map((t) => (t && t.data ? t.data : t)).filter(Boolean);
}

module.exports = {
  DATA_DIR,
  listStoreIds,
  getCustomers,
  getInteractions,
  getSubscriptions,
  getTransactions,
};
