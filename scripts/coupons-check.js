#!/usr/bin/env node
// scripts/coupons-check.js — Offline safety + behavior check. Run: npm run coupons:check

const cp = require('../lib/coupons');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(cp && cp.couponStore, 'module loads');

 // Percentage coupon with min-spend + per-contact limit.
 const pc = cp.couponStore.create({ code: 'EID20', type: 'percent', value: 20, minSpend: 500, perContactLimit: 1, maxRedemptions: 100 });
 assert(pc.code === 'EID20' && pc.type === 'percent', 'percent coupon created (code upper-cased)');

 // Validate below min-spend -> rejected.
 const low = cp.validator.validate({ code: 'eid20', amount: 300 });
 assert(low.ok === false && /minimum spend/.test(low.reason), 'below min-spend rejected (code case-insensitive)');

 // Validate above min-spend -> 20% discount.
 const v = cp.validator.validate({ code: 'EID20', amount: 1000, contact: '+923001234567' });
 assert(v.ok === true && v.discount === 200 && v.finalAmount === 800, '20% off 1000 = 200 discount, 800 final');

 // Redeem once -> recorded.
 const r1 = cp.redemption.redeem({ code: 'EID20', amount: 1000, contact: '+923001234567', orderId: 'ord-1' });
 assert(r1.redeemed === true && r1.discount === 200, 'redeem applies the discount');

 // Idempotent: same code + orderId returns the prior redemption, no double count.
 const r1b = cp.redemption.redeem({ code: 'EID20', amount: 1000, contact: '+923001234567', orderId: 'ord-1' });
 assert(r1b.idempotent === true && r1b.redemptionId === r1.redemptionId, 'same order is idempotent (no double redemption)');

 // Per-contact limit reached -> a NEW order from the same contact is rejected.
 const r2 = cp.validator.validate({ code: 'EID20', amount: 1000, contact: '+923001234567' });
 assert(r2.ok === false && /per-customer/.test(r2.reason), 'per-contact limit enforced');

 // Fixed coupon never discounts more than the order amount.
 cp.couponStore.create({ code: 'FLAT5000', type: 'fixed', value: 5000 });
 const fx = cp.validator.validate({ code: 'FLAT5000', amount: 1200 });
 assert(fx.ok && fx.discount === 1200 && fx.finalAmount === 0, 'fixed discount caps at the order amount');

 // Expired coupon rejected.
 cp.couponStore.create({ code: 'OLD', type: 'percent', value: 10, expiresAt: new Date(Date.now() - 86400000).toISOString() });
 const exp = cp.validator.validate({ code: 'OLD', amount: 500 });
 assert(exp.ok === false && exp.reason === 'expired', 'expired coupon rejected');

 // Bulk generate unique single-use codes.
 const bulk = cp.couponStore.bulkGenerate(5, { type: 'percent', value: 15 });
 assert(bulk.length === 5 && new Set(bulk.map((c) => c.code)).size === 5, 'bulk generates 5 unique codes');
 assert(bulk.every((c) => c.maxRedemptions === 1), 'bulk codes default to single-use');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all coupons checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
