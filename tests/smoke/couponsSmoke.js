#!/usr/bin/env node
// tests/smoke/couponsSmoke.js — Smoke test for global cap + free shipping + stats. Run: npm run coupons:smoke

const cp = require('../../lib/coupons');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!cp.redemption, 'redemption present');

 // Global maxRedemptions cap.
 const cap = cp.couponStore.create({ code: 'LIMIT2', type: 'percent', value: 10, maxRedemptions: 2 });
 cp.redemption.redeem({ code: 'LIMIT2', amount: 1000, contact: 'a', orderId: 'o1' });
 cp.redemption.redeem({ code: 'LIMIT2', amount: 1000, contact: 'b', orderId: 'o2' });
 const third = cp.redemption.redeem({ code: 'LIMIT2', amount: 1000, contact: 'c', orderId: 'o3' });
 t(third.redeemed === false && /limit reached/.test(third.reason), 'global redemption cap enforced');

 // free_shipping coupon: discount on goods is 0 but flag is set.
 cp.couponStore.create({ code: 'FREESHIP', type: 'free_shipping', value: 0 });
 const fs = cp.validator.validate({ code: 'FREESHIP', amount: 800 });
 t(fs.ok && fs.discount === 0 && fs.freeShipping === true, 'free_shipping yields 0 goods discount + freeShipping flag');

 // Validity window: not-yet-valid coupon rejected.
 cp.couponStore.create({ code: 'SOON', type: 'percent', value: 10, startsAt: new Date(Date.now() + 86400000).toISOString() });
 const soon = cp.validator.validate({ code: 'SOON', amount: 500 });
 t(soon.ok === false && soon.reason === 'not yet valid', 'future-dated coupon not yet valid');

 // Stats reflect redemptions + remaining.
 const st = cp.redemption.stats('LIMIT2');
 t(st.redemptions === 2 && st.remaining === 0, 'stats report redemptions + remaining');
 t(st.totalDiscount === 200, 'stats sum total discount (10% of 1000 x2)');

 // Unknown code.
 const unk = cp.validator.validate({ code: 'NOPE', amount: 100 });
 t(unk.ok === false && unk.reason === 'unknown code', 'unknown code rejected');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
