'use strict';
/**
 * Offline smoke test for #128 AI Product Recommender.
 * Forces the model host unreachable so we prove the deterministic core works.
 * Run: node tests/smoke/productRecommenderSmoke.js
 */
process.env.OLLAMA_HOST = 'http://127.0.0.1:1'; // unreachable on purpose
process.env.LLM_HUB_DRY_RUN = 'true';

const assert = require('assert');
const rec = require('../../lib/productRecommender/productRecommender');

(async () => {
  const tenantId = 'smoke-tenant-128';
  const contactId = 'c-1';

  // missing tenant must throw
  assert.throws(() => rec.recommend(null, contactId), /tenantId/);

  // seed a local catalog
  rec.saveLocalCatalog(tenantId, [
    { id: 'p1', name: 'Wireless Earbuds', category: 'audio', price: 4500, tags: ['music', 'bluetooth'], stock: 10, popularity: 80 },
    { id: 'p2', name: 'Yoga Mat', category: 'fitness', price: 2000, tags: ['gym', 'exercise'], stock: 5, popularity: 40 },
    { id: 'p3', name: 'Bluetooth Speaker', category: 'audio', price: 6000, tags: ['music', 'party'], stock: 0, popularity: 60 }
  ]);

  // set interests -> should rank audio products first
  rec.setContactInterests(tenantId, contactId, ['music', 'audio']);
  const r = rec.recommend(tenantId, contactId, { limit: 2 });
  assert.strictEqual(r.basedOn, 'interest_affinity');
  assert.ok(r.recommendations.length === 2, 'should return 2 recs');
  assert.ok(['p1', 'p3'].includes(r.recommendations[0].id), 'top rec should be audio');

  // no-signal contact -> popularity fallback, never throws
  const r2 = rec.recommend(tenantId, 'c-unknown', { limit: 3 });
  assert.strictEqual(r2.basedOn, 'popularity_fallback');
  assert.ok(r2.recommendations.length >= 1);

  // pitch must still produce a message with model unreachable
  const p = await rec.pitch(tenantId, contactId, { limit: 2 });
  assert.ok(p.message && p.message.length > 0, 'pitch should fall back to deterministic message');
  assert.strictEqual(p.source, 'deterministic');

  console.log('OK #128 product recommender smoke passed');
  console.log('  top:', r.recommendations[0].name, '| pitch source:', p.source);
})().catch((e) => {
  console.error('SMOKE FAIL #128:', e.message);
  process.exit(1);
});
