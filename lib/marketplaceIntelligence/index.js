'use strict';
/**
 * Marketplace Intelligence — facade.
 *
 * Central intelligence layer that ingests normalized signals from existing modules
 * (group commerce, channels, ecommerce, social, dealer, orders) into a seller/buyer/
 * SKU/price/stock graph, then derives rankings, opportunities, recommendations,
 * digests and reports. 100% dry-run + masked by default.
 */
const store = require('./store');
const graph = require('./entityGraph');
const relationshipBuilder = require('./relationshipBuilder');
const adapters = require('./adapters');
const sellerRanking = require('./sellerRanking');
const sellerProfiler = require('./sellerProfiler');
const buyerProfiler = require('./buyerProfiler');
const buyerMatching = require('./buyerMatching');
const priceRadar = require('./priceRadar');
const stockRadar = require('./stockRadar');
const opportunityDetector = require('./opportunityDetector');
const recommendationEngine = require('./recommendationEngine');
const aiAdvisor = require('./aiAdvisor');
const digestBuilder = require('./digestBuilder');
const reportBuilder = require('./reportBuilder');
const searchIndex = require('./searchIndex');

function isEnabled() { return String(process.env.MARKETPLACE_INTELLIGENCE_ENABLED || 'true').toLowerCase() !== 'false'; }
function isDryRun() { return String(process.env.MARKETPLACE_INTELLIGENCE_DRY_RUN || 'true').toLowerCase() !== 'false'; }

/** Ingest raw payload from a source. Returns a safe summary. */
function ingest(sourceType, payload, opts = {}) {
  const state = store.read();
  const signals = adapters.normalize(sourceType, payload, state.skus);
  let created = 0;
  for (const sig of signals) {
    relationshipBuilder.build(state, sig);
    // ecommerce_product entity for price-spread opportunities
    if (sig._ecommerce && sig._ecommerce.value) {
      graph.upsertEntity(state, { id: 'eco_' + sig._ecommerce.sku, type: 'ecommerce_product', label: sig.productLabel || sig._ecommerce.sku, confidence: 0.8, metadataSafe: { sku: sig._ecommerce.sku, value: sig._ecommerce.value, currency: sig._ecommerce.currency } });
      if (sig._ecommerce.sku) graph.addRelationship(state, { type: 'ecommerce_matches_sku', from: 'eco_' + sig._ecommerce.sku, to: sig._ecommerce.sku, confidence: 0.8 });
    }
    created++;
  }
  store.write(state);
  store.appendHistory({ event: 'ingest', sourceType, signals: created, dryRun: isDryRun() });
  return { ok: true, dryRun: isDryRun(), sourceType, ingested: created, sampleIntents: signals.slice(0, 5).map(s => s.intent) };
}

function status() {
  const state = store.read();
  const byType = {};
  for (const e of Object.values(state.entities)) byType[e.type] = (byType[e.type] || 0) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const isToday = e => (e.lastSeenAt || '').slice(0, 10) === today;
  return {
    enabled: isEnabled(), dryRun: isDryRun(),
    sellersTracked: byType.seller || 0,
    buyersTracked: byType.buyer || 0,
    skusTracked: byType.sku || 0,
    offersToday: Object.values(state.entities).filter(e => e.type === 'offer' && isToday(e)).length,
    buyerRequestsToday: Object.values(state.entities).filter(e => e.type === 'demand' && isToday(e)).length,
    stockUpdates: byType.stock || 0,
    priceChanges: priceRadar.detectChanges(state).length,
    highRiskPosts: Object.values(state.entities).filter(e => (e.riskFlags || []).length).length,
    aiOpportunities: opportunityDetector.detect(state).length,
    entityCounts: byType,
    relationshipCount: state.relationships.length,
    updatedAt: state.updatedAt
  };
}

const graphView = () => { const s = store.read(); return { entities: Object.values(s.entities), relationships: s.relationships, skus: s.skus }; };
const entities = (type) => { const s = store.read(); return type ? graph.entitiesByType(s, type) : Object.values(s.entities); };
const entity = (id) => { const s = store.read(); return { entity: graph.getEntity(s, id), relationships: graph.relationshipsFor(s, id) }; };
const sellers = () => sellerRanking.leaderboard(store.read());
const buyers = () => buyerProfiler.profiles(store.read());
const skus = () => store.read().skus;
const prices = () => priceRadar.summarize(store.read());
const stock = () => stockRadar.summarize(store.read());
const opportunities = () => opportunityDetector.detect(store.read());
const recommendations = (aiCallFn) => aiAdvisor.advise(store.read(), aiCallFn);
const digest = () => digestBuilder.build(store.read());
const report = (kind, format) => reportBuilder.build(store.read(), kind, format);
const search = (q, opts) => searchIndex.search(store.read(), q, opts);
const history = () => store.readHistory();
const matches = () => buyerMatching.matchAll(store.read());

module.exports = {
  isEnabled, isDryRun, ingest, status, graphView, entities, entity,
  sellers, buyers, skus, prices, stock, opportunities, recommendations,
  digest, report, search, history, matches,
  // expose submodules for advanced use/tests
  store, graph, adapters, sellerProfiler
};
