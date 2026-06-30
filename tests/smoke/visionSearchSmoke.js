// tests/smoke/visionSearchSmoke.js
// Offline smoke test for image product search. Points OLLAMA_HOST at an
// unreachable address so the vision call fails gracefully. Seeds the RAG store
// (which itself falls back to keyword matching offline) so catalog matching is
// exercised end-to-end with no model. Exit code 0 = pass.
//
// Run: node tests/smoke/visionSearchSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> vision + embeddings fall back

const assert = require('assert');
const vision = require('../../lib/visionSearch/visionSearch');
const { parseDescription } = vision._internal;

let rag = null;
try { rag = require('../../ai/knowledgeBase/ragStore'); } catch { /* ok */ }

(async () => {
  let passed = 0;
  const STORE = 'vision_smoke';

  // description parser
  const d = parseDescription('CATEGORY: shoes\nCOLOR: red\nATTRIBUTES: leather, formal\nKEYWORDS: red shoe, leather, formal, mens');
  assert.strictEqual(d.category, 'shoes'); passed++;
  assert.strictEqual(d.color, 'red'); passed++;
  assert.ok(d.keywords.includes('leather')); passed++;

  // seed catalog into RAG (text-only, embeddings unreachable -> keyword match)
  if (rag) {
    rag.clear(STORE);
    await rag.ingestProducts(STORE, [
      { name: 'Red Leather Formal Shoes', description: 'mens red leather formal shoes', price: 4999 },
      { name: 'Blue Running Sneakers', description: 'lightweight blue sneakers', price: 3999 }
    ]);
    passed++;
  }

  // searchByImage with a fake buffer -> vision unavailable, but hint drives match
  const r = await vision.searchByImage({ storeId: STORE, buffer: Buffer.from('not-an-image'), hint: 'red leather formal shoes' });
  assert.ok(r.source === 'vision_unavailable' || r.source === 'vision', 'vision should be attempted'); passed++;
  assert.ok('answer' in r && r.answer.length, 'should produce an answer'); passed++;
  if (rag) { assert.ok(r.matches.length >= 1, 'hint should match a seeded product'); passed++; }

  // hint-only (no image) still works
  const r2 = await vision.searchByImage({ storeId: STORE, hint: 'blue sneakers' });
  assert.ok('answer' in r2); passed++;
  if (rag) { assert.ok(r2.matches.some(m => /sneakers/i.test(m.title || '')), 'should find sneakers'); passed++; }

  // nothing provided -> graceful prompt
  const r3 = await vision.searchByImage({ storeId: STORE });
  assert.ok(/send a photo|type its name/i.test(r3.answer)); passed++;

  // health reports unreachable cleanly
  const h = await vision.health();
  assert.strictEqual(h.visionReachable, false); passed++;

  if (rag) rag.clear(STORE);
  console.log(`\u2705 visionSearch smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c visionSearch smoke failed:', e); process.exit(1); });
