// tests/smoke/ragStoreSmoke.js
// Offline smoke test for the RAG store. Forces the keyword-fallback path by
// pointing OLLAMA_HOST at an unreachable address, so it runs with no model.
// Exit code 0 = pass.
//
// Run: node tests/smoke/ragStoreSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // guaranteed unreachable -> fallback

const assert = require('assert');
const rag = require('../../ai/knowledgeBase/ragStore');
const { chunkText, cosine, keywordScore } = rag._internal;

(async () => {
  let passed = 0;
  const STORE = 'rag_smoke_store';
  rag.clear(STORE);

  // chunking
  assert.ok(chunkText('a'.repeat(2000)).length > 1, 'long text should split'); passed++;
  assert.strictEqual(chunkText('short').length, 1); passed++;

  // math
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9); passed++;
  assert.ok(cosine([1, 0], [0, 1]) === 0); passed++;
  assert.ok(keywordScore('delivery time', 'what are your delivery times') > 0); passed++;

  // ingest (text-only, embeddings unreachable) + keyword search
  const ing = await rag.ingestText(STORE, { title: 'Delivery', text: 'Digital products are delivered instantly after payment confirmation.', source: 'faq' });
  assert.strictEqual(ing.embedded, false, 'should fall back to text-only'); passed++;
  assert.ok(ing.added >= 1); passed++;

  await rag.ingestText(STORE, { title: 'Refunds', text: 'Refunds are available within 24 hours if the product was not delivered.', source: 'faq' });

  const hits = await rag.search(STORE, 'how long does delivery take?', { k: 2 });
  assert.ok(hits.length >= 1, 'should retrieve something'); passed++;
  assert.strictEqual(hits[0].mode, 'keyword'); passed++;
  assert.ok(/delivered/i.test(hits[0].text), 'top hit should be the delivery chunk'); passed++;

  const s = rag.stats(STORE);
  assert.ok(s.totalChunks >= 2); passed++;

  rag.clear(STORE);
  console.log(`\u2705 ragStore smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c ragStore smoke failed:', e); process.exit(1); });
