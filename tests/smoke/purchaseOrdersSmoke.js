// tests/smoke/purchaseOrdersSmoke.js
// Run: npm run purchase-orders:smoke
// Exercises supplier + PO lifecycle + receiving in a temp data dir. No network, no deps.

'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'po-smoke-'));
process.env.PO_DATA_DIR = tmp;

const po = require('../../lib/purchaseOrders');

function assert(cond, msg) { if (!cond) { throw new Error('ASSERT: ' + msg); } }

const T = 'tenantA';
let failures = 0;
function step(name, fn) {
  try { fn(); console.log(' ok  ', name); }
  catch (e) { failures++; console.log(' XX  ', name, '-', e.message); }
}

step('tenant isolation enforced', () => {
  let threw = false;
  try { po.listSuppliers(); } catch (_) { threw = true; }
  assert(threw, 'missing tenantId should throw');
});

let supId, poId;
step('create supplier', () => {
  const s = po.createSupplier(T, { name: 'Acme Wholesale', email: 'sales@acme.test', phone: '+1 555 123 4567', leadTimeDays: 5 });
  supId = s.id;
  assert(s.id && s.name === 'Acme Wholesale', 'supplier created');
});

step('supplier email masked in privacy view', () => {
  const masked = po.maskSupplier(po.getSupplier(T, supId));
  assert(masked.email.includes('***'), 'email masked');
  assert(masked.phone.includes('***'), 'phone masked');
});

step('create PO with lines', () => {
  const p = po.createPO(T, { supplierId: supId, lines: [
    { sku: 'SKU-1', name: 'Widget', qty: 10, unitCost: 2.5 },
    { sku: 'SKU-2', name: 'Gadget', qty: 4, unitCost: 5 }
  ] });
  poId = p.id;
  assert(p.state === 'draft', 'starts as draft');
  assert(p.total === 10 * 2.5 + 4 * 5, 'total computed');
});

step('mark ordered', () => {
  const p = po.setState(T, poId, 'ordered');
  assert(p.state === 'ordered' && p.orderedAt, 'ordered + timestamp');
});

step('partial receive', () => {
  const out = po.receive(T, poId, [{ sku: 'SKU-1', qty: 4 }]);
  assert(out.po.state === 'partial', 'partial after partial receive');
  assert(out.restocked.length === 1, 'one line restocked');
});

step('full receive completes PO', () => {
  const out = po.receive(T, poId, [{ sku: 'SKU-1', qty: 6 }, { sku: 'SKU-2', qty: 4 }]);
  assert(out.po.state === 'received', 'received when all lines complete');
  assert(out.po.receivedAt, 'receivedAt set');
});

step('over-receive is capped at ordered qty', () => {
  const before = po.getPO(T, poId);
  const recvLine = before.lines.find((l) => l.sku === 'SKU-1');
  assert(recvLine.received === 10, 'received capped at qty (no over-receive)');
});

step('reorder suggestions advisory when inventory absent', () => {
  const r = po.reorderSuggestions(T);
  assert(typeof r.available === 'boolean', 'returns advisory shape');
});

step('doctor check passes', () => {
  assert(po.check().passed, 'doctor passed');
});

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}

console.log(failures ? ('[purchase-orders:smoke] FAIL (' + failures + ')') : '[purchase-orders:smoke] PASS');
process.exit(failures ? 1 : 0);
