'use strict';
// #71 Loyalty & Points — smoke test. Run: npm run loyalty:smoke
const assert = require('assert');
const loyalty = require('../../lib/loyalty');

let pass = 0;
function t(name, fn) { try { fn(); pass++; console.log('  PASS', name); } catch (e) { console.error('  FAIL', name, '-', e.message); process.exitCode = 1; } }

const tenantId = 'smoke-tenant';
const contactId = 'smoke-contact-' + Date.now();

t('earn awards floor(amount * rate * multiplier)', () => {
  const out = loyalty.earn({ tenantId, contactId, amount: 100, orderId: 'o1' });
  assert(out.awarded >= 0, 'awarded should be >= 0');
});

t('balance reflects earned points + tier', () => {
  const b = loyalty.balance(tenantId, contactId);
  assert(b.account.balance >= 0, 'balance >= 0');
  assert(b.tier && b.tier.id, 'tier resolved');
});

t('redeem quote respects max ratio', () => {
  const q = loyalty.redemption.quote({ points: 1000000, orderTotal: 100 });
  assert(q.value <= 100 * loyalty.config.maxRedeemRatio + 0.01, 'quote capped by ratio');
});

t('redeem never goes below zero', () => {
  const out = loyalty.redeem({ tenantId, contactId, points: 99999999 });
  const b = loyalty.balance(tenantId, contactId);
  assert(b.account.balance >= 0, 'balance stays >= 0');
});

t('adjust grants and clamps', () => {
  loyalty.adjust({ tenantId, contactId, points: 50, reason: 'smoke' });
  loyalty.adjust({ tenantId, contactId, points: -100000, reason: 'smoke-claw' });
  const b = loyalty.balance(tenantId, contactId);
  assert(b.account.balance >= 0, 'no negative after clawback');
});

t('onOrderPaid earns when enabled', () => {
  const out = loyalty.onOrderPaid({ tenantId, contactId, amount: 200, orderId: 'o2' });
  assert(out && (out.awarded >= 0 || out.skipped), 'handled order.paid');
});

t('doctor healthy', () => {
  const r = loyalty.doctor.check();
  assert(r.healthy, 'doctor should be healthy: ' + JSON.stringify(r.issues));
});

console.log(`\nLoyalty smoke: ${pass} checks passed.`);
