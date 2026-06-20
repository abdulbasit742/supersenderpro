'use strict';
/**
 * entityGraph.js — entity + relationship CRUD on top of store.js.
 *
 * Entity shape:
 *   { id, type, label, confidence, sourceType, sourceId, sourceName,
 *     firstSeenAt, lastSeenAt, tags[], riskFlags[], metadataSafe{} }
 */

const store = require('./store');

const ENTITY_TYPES = ['seller', 'buyer', 'product', 'sku', 'offer', 'demand', 'stock', 'price', 'source', 'channel', 'group', 'social_post', 'ecommerce_product', 'order', 'alert', 'ai_recommendation'];
const REL_TYPES = ['seller_offers_product', 'buyer_wants_product', 'product_has_sku', 'sku_has_price', 'seller_has_stock', 'source_reported_offer', 'source_reported_demand', 'ecommerce_matches_sku', 'channel_promoted_product', 'social_promoted_product', 'buyer_created_order', 'seller_price_changed', 'stock_changed', 'ai_recommended_action'];

function clampConfidence(c) { const n = Number(c); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5; }

/** Insert or update an entity (idempotent by id). */
function upsertEntity(state, e) {
  const now = new Date().toISOString();
  if (!e.id || !e.type) throw new Error('entity requires id and type');
  const existing = state.entities[e.id];
  const merged = {
    id: e.id,
    type: e.type,
    label: e.label || existing?.label || e.id,
    confidence: clampConfidence(e.confidence != null ? e.confidence : existing?.confidence),
    sourceType: e.sourceType || existing?.sourceType || 'unknown',
    sourceId: e.sourceId || existing?.sourceId || null,
    sourceName: e.sourceName || existing?.sourceName || null,
    firstSeenAt: existing?.firstSeenAt || now,
    lastSeenAt: now,
    tags: Array.from(new Set([...(existing?.tags || []), ...(e.tags || [])])),
    riskFlags: Array.from(new Set([...(existing?.riskFlags || []), ...(e.riskFlags || [])])),
    metadataSafe: { ...(existing?.metadataSafe || {}), ...(e.metadataSafe || {}) }
  };
  state.entities[e.id] = merged;
  return merged;
}

/** Add a relationship (dedupes identical type+from+to, refreshes ts/confidence). */
function addRelationship(state, rel) {
  if (!REL_TYPES.includes(rel.type)) throw new Error('unknown relationship type: ' + rel.type);
  const now = new Date().toISOString();
  const found = state.relationships.find(r => r.type === rel.type && r.from === rel.from && r.to === rel.to);
  if (found) {
    found.ts = now;
    found.confidence = clampConfidence(rel.confidence != null ? rel.confidence : found.confidence);
    found.count = (found.count || 1) + 1;
    if (rel.metadataSafe) found.metadataSafe = { ...(found.metadataSafe || {}), ...rel.metadataSafe };
    return found;
  }
  const r = { type: rel.type, from: rel.from, to: rel.to, ts: now, confidence: clampConfidence(rel.confidence), count: 1, metadataSafe: rel.metadataSafe || {} };
  state.relationships.push(r);
  return r;
}

function entitiesByType(state, type) { return Object.values(state.entities).filter(e => e.type === type); }
function getEntity(state, id) { return state.entities[id] || null; }
function relationshipsFor(state, id) { return state.relationships.filter(r => r.from === id || r.to === id); }

module.exports = { ENTITY_TYPES, REL_TYPES, upsertEntity, addRelationship, entitiesByType, getEntity, relationshipsFor, clampConfidence, store };
