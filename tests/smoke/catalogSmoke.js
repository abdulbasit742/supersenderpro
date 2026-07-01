// tests/smoke/catalogSmoke.js
// Offline smoke test for the catalog manager. No model: enrichment uses the
// deterministic fallback (price parse + category guess + tags). RAG may be
// absent; add/list/delete are exercised end-to-end. Exit code 0 = pass.
//
// Run: node tests/smoke/catalogSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback enrichment

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cat = require('../../lib/catalog/catalogManager');
const { parsePrice, guessCategory, basicTags } = cat._internal;

function clear(storeId) {
  try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'catalog', `${storeId}_catalog.json`)); } catch {}
}

(async () => {
  let passed = 0;
  const STORE = 'catalog_smoke';
  clear(STORE);

  // price parsing
  assert.strictEqual(parsePrice('red kurta 1500 cotton'), 1500); passed++;
  assert.strictEqual(parsePrice('Rs. 2,499 only'), 2499); passed++;
  assert.strictEqual(parsePrice('no price here'), null); passed++;

  // category guessing
  assert.strictEqual(guessCategory('cotton kurta red'), 'apparel'); passed++;
  assert.strictEqual(guessCategory('wireless earbuds'), 'electronics'); passed++;
  assert.strictEqual(guessCategory('mystery thing'), 'general'); passed++;

  // tags
  const tags = basicTags('Red Kurta', 'soft cotton summer');
  assert.ok(tags.includes('kurta') && tags.includes('cotton')); passed++;

  // enrich (fallback) builds a usable entry
  const e = await cat.enrich({ name: 'Red Kurta', raw: 'soft cotton, 1500' });
  assert.strictEqual(e.source, 'fallback'); passed++;
  assert.strictEqual(e.price, 1500); passed++;
  assert.strictEqual(e.category, 'apparel'); passed++;
  assert.ok(e.tags.length >= 1 && e.description.length >= 1); passed++;

  // addProduct stores + returns a record with an id
  const a = await cat.addProduct({ storeId: STORE, name: 'Red Kurta', raw: 'soft cotton 1500', syncRag: false });
  assert.ok(a.product && a.product.id && a.product.price === 1500); passed++;

  // dedupe by normalized name (same name updates, not duplicates)
  const a2 = await cat.addProduct({ storeId: STORE, name: 'red  kurta', raw: 'premium cotton 1800', syncRag: false });
  assert.strictEqual(a2.product.id, a.product.id, 'same name should update, not duplicate'); passed++;
  assert.strictEqual(cat.listProducts({ storeId: STORE }).length, 1); passed++;

  // bulk add
  const b = await cat.bulkAdd({ storeId: STORE, items: ['Wireless Earbuds black 3999', 'Ceramic Mug 600', { name: 'Gift Card', raw: 'digital voucher', price: 1000 }], syncRag: false });
  assert.strictEqual(b.added, 3); passed++;
  assert.ok(cat.listProducts({ storeId: STORE }).length === 4); passed++;

  // list by category
  const electronics = cat.listProducts({ storeId: STORE, category: 'electronics' });
  assert.ok(electronics.find(p => /earbuds/i.test(p.name))); passed++;

  // get + delete
  assert.ok(cat.getProduct({ storeId: STORE, name: 'Ceramic Mug' })); passed++;
  assert.strictEqual(cat.deleteProduct({ storeId: STORE, name: 'Ceramic Mug' }).deleted, true); passed++;
  assert.ok(!cat.getProduct({ storeId: STORE, name: 'Ceramic Mug' })); passed++;

  // missing args throw
  let threw = false; try { await cat.enrich({}); } catch { threw = true; }
  assert.ok(threw, 'enrich with no input should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 catalog smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c catalog smoke failed:', e); process.exit(1); });
