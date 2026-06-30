// tests/smoke/orderExtractionSmoke.js
// Offline smoke test for order extraction. No model: AI parse returns null, so
// the deterministic regex fallback is exercised. RAG may be absent; matching
// degrades to unmatched items. Exit code 0 = pass.
//
// Run: node tests/smoke/orderExtractionSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback parser

const assert = require('assert');
const orders = require('../../lib/orderExtraction/orderExtractor');
const { parseFallback, summarize, missingFields } = orders._internal;

(async () => {
  let passed = 0;

  // fallback parser pulls items, city, payment
  const p = parseFallback('2 red shirts size M, deliver to Lahore, cash on delivery');
  assert.ok(p.items.length >= 1, 'should find an item'); passed++;
  assert.strictEqual(p.items[0].qty, 2); passed++;
  assert.strictEqual(p.payment, 'cod'); passed++;
  assert.strictEqual(p.city, 'lahore'); passed++;

  // payment variants
  assert.strictEqual(parseFallback('1 mug, jazzcash').payment, 'jazzcash'); passed++;
  assert.strictEqual(parseFallback('3 caps bank transfer').payment, 'bank'); passed++;

  // missingFields detects gaps
  const miss = missingFields({ items: [], address: null, payment: null });
  assert.ok(miss.includes('items') && miss.includes('delivery address') && miss.includes('payment method')); passed++;

  // summarize builds a confirmation block
  const sum = summarize({ items: [{ name: 'red shirt', qty: 2, color: 'red', size: 'M', unitPrice: 1000 }], address: 'Lahore', payment: 'cod' });
  assert.ok(/Order summary/i.test(sum.text)); passed++;
  assert.strictEqual(sum.total, 2000); passed++;
  assert.ok(/CONFIRM/.test(sum.text)); passed++;

  // extractOrder end-to-end (fallback) + draft persistence + confirm
  const STORE = 'order_smoke'; const PHONE = '+920000000077';
  const ex = await orders.extractOrder({ storeId: STORE, phone: PHONE, text: '2 red shirts size M, deliver to Lahore, COD' });
  assert.strictEqual(ex.source, 'fallback'); passed++;
  assert.ok(ex.order.items.length >= 1); passed++;
  assert.ok(orders.getDraft({ storeId: STORE, phone: PHONE }), 'draft should persist'); passed++;

  // confirm succeeds when complete (items + address + payment all present)
  const conf = orders.confirmOrder({ storeId: STORE, phone: PHONE });
  assert.strictEqual(conf.confirmed, true, `expected confirm, got ${JSON.stringify(conf)}`); passed++;

  // incomplete order cannot confirm
  const PHONE2 = '+920000000078';
  await orders.extractOrder({ storeId: STORE, phone: PHONE2, text: 'i want 1 cap' }); // no address/payment
  const conf2 = orders.confirmOrder({ storeId: STORE, phone: PHONE2 });
  assert.strictEqual(conf2.confirmed, false); passed++;
  assert.ok(conf2.missing && conf2.missing.length); passed++;

  // missing text throws
  let threw = false; try { await orders.extractOrder({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'extract with no text should throw'); passed++;

  console.log(`\u2705 orderExtraction smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c orderExtraction smoke failed:', e); process.exit(1); });
