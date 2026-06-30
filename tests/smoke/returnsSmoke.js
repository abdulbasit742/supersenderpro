#!/usr/bin/env node
// tests/smoke/returnsSmoke.js
// End-to-end smoke for the RMA lifecycle using a throwaway data file.
// No network, no external deps. Exits non-zero on failure.

'use strict';

const path = require('path');
const fs = require('fs');

// Use an isolated data file so we never touch real data.
const TMP = path.resolve(process.cwd(), 'data/returns.smoke.json');
process.env.RETURNS_DATA_FILE = 'data/returns.smoke.json';
if (fs.existsSync(TMP)) fs.unlinkSync(TMP);

const returns = require('../../lib/returns');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('ok:', msg);
}

const T = 'tenant_smoke';

// 1. create
const created = returns.createReturn(T, {
  orderId: 'ord_1',
  customer: { name: 'Jane Doe', email: 'jane@example.com', phone: '+12025550123' },
  lineItems: [{ sku: 'SKU1', qty: 2, unitPrice: 10 }],
  reason: 'damaged'
});
assert(created.status === 'requested', 'created in requested state');

// 2. approve
const approved = returns.approve(T, created.id);
assert(approved.rec.status === 'approved', 'approved');
assert(approved.notice.draftOnly === true, 'notice is draft-only by default');

// 3. receive (inventory absent -> degrades gracefully)
const received = returns.receive(T, created.id);
assert(received.rec.status === 'received', 'received');
assert(received.restock.restocked === false, 'restock degrades when inventory absent');

// 4. refund (proposes net, does not charge)
const refunded = returns.refund(T, created.id, { restockingFeePct: 0.1 });
assert(refunded.rec.status === 'refunded', 'refunded');
assert(refunded.refund.gross === 20, 'gross 20');
assert(refunded.refund.net === 18, 'net 18 after 10% restock fee');
assert(refunded.event.name === 'return.refunded', 'emits return.refunded event');

// 5. tenant isolation
let threw = false;
try { returns.list(undefined); } catch (e) { threw = true; }
assert(threw, 'tenant isolation enforced');

// 6. illegal transition guarded
let illegal = false;
try { returns.approve(T, created.id); } catch (e) { illegal = true; }
assert(illegal, 'illegal transition rejected (refunded -> approved)');

// cleanup
if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
console.log('\nreturns smoke: PASSED');
