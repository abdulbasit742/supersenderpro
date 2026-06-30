// Offline smoke test: forces OLLAMA_HOST unreachable, asserts deterministic
// totals math, invoice numbering, and tenant isolation. No model required.

'use strict';

process.env.OLLAMA_HOST = 'http://127.0.0.1:1'; // unreachable on purpose

const assert = require('assert');
const gen = require('../../lib/invoiceGenerator/invoiceGenerator');

(async function () {
  const tenantA = 'smoke-tenant-A-' + Date.now();
  const tenantB = 'smoke-tenant-B-' + Date.now();

  // 1) deterministic totals
  const order = {
    currency: 'PKR',
    taxRate: 10,
    discount: 50,
    items: [
      { name: 'Widget', qty: 2, price: 100 },   // 200
      { name: 'Gadget', qty: 1, price: 49.99 }   // 49.99
    ]
  };
  const inv = await gen.createInvoice(tenantA, order, { thankYou: false });
  assert.strictEqual(inv.subtotal, 249.99, 'subtotal math');
  assert.strictEqual(inv.taxAmount, 25.00, 'tax math');
  assert.strictEqual(inv.grandTotal, gen.round2(249.99 - 50 + 25.00), 'grand total math');

  // 2) numbering increments and is year-scoped
  const inv2 = await gen.createInvoice(tenantA, order, { thankYou: false });
  assert.notStrictEqual(inv.invoiceNumber, inv2.invoiceNumber, 'numbering increments');
  assert.ok(/^INV-\d{4}-\d{5}$/.test(inv.invoiceNumber), 'numbering format');

  // 3) tenant isolation: B cannot read A's invoice
  const crossRead = gen.getInvoice(tenantB, inv.invoiceNumber);
  assert.strictEqual(crossRead, null, 'tenant isolation');

  // 4) thank-you offline fallback still produces text
  const inv3 = await gen.createInvoice(tenantA, order, { thankYou: true });
  assert.ok(inv3.thankYou && inv3.thankYou.length > 0, 'offline thank-you fallback');

  // 5) missing tenantId throws
  let threw = false;
  try { gen.buildInvoice(null, order); } catch (_) { threw = true; }
  assert.ok(threw, 'missing tenantId throws');

  // 6) render produces text receipt
  const txt = gen.renderText(inv);
  assert.ok(txt.indexOf('TOTAL:') !== -1, 'render contains total');

  console.log('invoiceGenerator smoke: PASS');
})().catch(function (e) {
  console.error('invoiceGenerator smoke: FAIL', e);
  process.exit(1);
});
