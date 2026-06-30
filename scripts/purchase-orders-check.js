// scripts/purchase-orders-check.js
// Run: npm run purchase-orders:check

'use strict';

const { check } = require('../lib/purchaseOrders/doctor');
const out = check();
console.log('[purchase-orders:check]', out.passed ? 'PASS' : 'FAIL');
for (const r of out.results) {
  console.log(' ', r.pass ? 'ok ' : 'XX ', r.name, r.detail ? ('- ' + r.detail) : '');
}
process.exit(out.passed ? 0 : 1);
