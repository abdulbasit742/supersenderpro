// lib/returns/doctor.js
// Self-diagnostic for the returns department. Safe to run anytime.

'use strict';

const config = require('./config');
const store = require('./store');
const returnStore = require('./returnStore');
const { computeRefund } = require('./refundCalc');

function check() {
  const results = [];
  const ok = (name, detail) => results.push({ name, ok: true, detail });
  const fail = (name, detail) => results.push({ name, ok: false, detail });

  // 1. Store readable/writable.
  try {
    store.readAll();
    ok('store', `data file at ${store.FILE}`);
  } catch (e) {
    fail('store', e.message);
  }

  // 2. Config sane.
  if (config.returnWindowDays >= 0) ok('config.window', `${config.returnWindowDays}d`);
  else fail('config.window', 'negative window');

  if (config.restockingFeePct >= 0 && config.restockingFeePct <= 1) {
    ok('config.restockFee', `${config.restockingFeePct}`);
  } else {
    fail('config.restockFee', 'fee pct must be 0..1');
  }

  // 3. Refund math.
  const r = computeRefund([{ sku: 'X', qty: 2, unitPrice: 10 }], { restockingFeePct: 0.1 });
  if (r.gross === 20 && r.restockingFee === 2 && r.net === 18) ok('refundCalc', '20 -> 18');
  else fail('refundCalc', JSON.stringify(r));

  // 4. Tenant isolation enforced.
  try {
    returnStore.list(undefined);
    fail('tenantIsolation', 'missing tenantId did not throw');
  } catch (e) {
    ok('tenantIsolation', 'missing tenantId throws');
  }

  const allOk = results.every((x) => x.ok);
  return { ok: allOk, results };
}

module.exports = { check };
