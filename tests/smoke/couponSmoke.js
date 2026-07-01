'use strict';
/**
 * Offline smoke test for the coupon engine.
 * Forces OLLAMA_HOST unreachable so AI phrasing must fall back to templates.
 * Run: node tests/smoke/couponSmoke.js
 */
process.env.OLLAMA_HOST = 'http://127.0.0.1:1'; // unreachable

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

// isolate data dir for the test
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coupon-smoke-'));
process.chdir(tmp);

const engine = require(path.join(__dirname, '..', '..', 'lib', 'couponEngine', 'couponEngine'));

(async () => {
  const T1 = 'tenant-a';
  const T2 = 'tenant-b';

  // tenant required
  assert.throws(() => engine.createCoupon(null, { code: 'X', value: 10 }), /tenantId is required/);

  // create percent coupon
  const c = engine.createCoupon(T1, {
    code: 'save10', type: 'percent', value: 10, minOrder: 500, maxUses: 2, perCustomer: 1
  });
  assert.strictEqual(c.code, 'SAVE10');
  assert.strictEqual(c.type, 'percent');

  // below min order
  let v = engine.validateCoupon(T1, 'SAVE10', { orderTotal: 400, customerId: 'c1' });
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.reason, 'below_min_order');

  // valid discount math
  v = engine.validateCoupon(T1, 'save10', { orderTotal: 1000, customerId: 'c1' });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.discount, 100);
  assert.strictEqual(v.finalTotal, 900);

  // redeem + per-customer limit
  let r = engine.redeemCoupon(T1, 'SAVE10', { orderTotal: 1000, customerId: 'c1' });
  assert.strictEqual(r.redeemed, true);
  r = engine.redeemCoupon(T1, 'SAVE10', { orderTotal: 1000, customerId: 'c1' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'per_customer_limit');

  // max uses reached (c2 redeems, hitting maxUses=2)
  r = engine.redeemCoupon(T1, 'SAVE10', { orderTotal: 1000, customerId: 'c2' });
  assert.strictEqual(r.redeemed, true);
  r = engine.redeemCoupon(T1, 'SAVE10', { orderTotal: 1000, customerId: 'c3' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'max_uses_reached');

  // fixed coupon + expiry
  engine.createCoupon(T1, { code: 'flat50', type: 'fixed', value: 50, expiresAt: '2000-01-01T00:00:00Z' });
  v = engine.validateCoupon(T1, 'FLAT50', { orderTotal: 200 });
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.reason, 'expired');

  // fixed discount math (not expired)
  engine.createCoupon(T1, { code: 'flat50b', type: 'fixed', value: 50 });
  v = engine.validateCoupon(T1, 'FLAT50B', { orderTotal: 200 });
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.discount, 50);
  assert.strictEqual(v.finalTotal, 150);

  // discount never exceeds order total
  engine.createCoupon(T1, { code: 'big', type: 'fixed', value: 9999 });
  v = engine.validateCoupon(T1, 'BIG', { orderTotal: 100 });
  assert.strictEqual(v.discount, 100);
  assert.strictEqual(v.finalTotal, 0);

  // tenant isolation: T2 cannot see T1 coupons
  assert.strictEqual(engine.getCoupon(T2, 'SAVE10'), null);
  v = engine.validateCoupon(T2, 'SAVE10', { orderTotal: 1000 });
  assert.strictEqual(v.ok, false);
  assert.strictEqual(v.reason, 'not_found');

  // AI phrasing falls back to template when Ollama unreachable
  const msg = await engine.phraseOffer(c, { lang: 'en', timeoutMs: 800 });
  assert.ok(msg && msg.includes('SAVE10'), 'fallback offer message should include code');

  console.log('couponSmoke: OK');
})().catch((e) => {
  console.error('couponSmoke: FAIL', e);
  process.exit(1);
});
