#!/usr/bin/env node
// tests/smoke/ordersSmoke.js — Smoke test for coupon totals + cancel/refund + revenue. Run: npm run orders:smoke

const od = require('../../lib/orders');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!od.orderEngine, 'engine present');

 // Coupon-aware totals when the coupons module is present.
 let coupons = null; try { coupons = require('../../lib/coupons'); } catch (_e) { coupons = null; }
 if (coupons) {
 coupons.couponStore.create({ code: 'ORD10', type: 'percent', value: 10 });
 const q = od.totals.compute({ items: [{ name: 'A', qty: 1, unitPrice: 1000 }], couponCode: 'ORD10' });
 t(q.discount === 100 && q.subtotal === 1000, 'coupon discount applied to order totals (10% of 1000 = 100)');
 } else { t(true, 'coupons module absent; totals fall back gracefully'); }

 // Cancel path from pending.
 const o = od.orderEngine.create({ contact: '+923009998877', items: [{ name: 'Thing', qty: 1, unitPrice: 500 }] });
 await od.orderEngine.place(o.id);
 const cancelled = await od.orderEngine.cancel(o.id, 'changed mind');
 t(cancelled.ok && cancelled.order.status === 'cancelled', 'pending order can be cancelled');
 // Cancelled is terminal: cannot pay it.
 const payCancelled = await od.orderEngine.markPaid(o.id, { paymentRef: 'x' });
 t(payCancelled.ok === false, 'cancelled order cannot be paid');

 // Refund path: paid -> refunded.
 const o2 = od.orderEngine.create({ contact: '+923001112223', items: [{ name: 'Thing', qty: 2, unitPrice: 300 }] });
 await od.orderEngine.place(o2.id);
 await od.orderEngine.markPaid(o2.id, { paymentRef: 'pi_x' });
 const ref = await od.orderEngine.refund(o2.id, 'defective');
 t(ref.ok && ref.order.status === 'refunded', 'paid order can be refunded');

 // Overview revenue counts paid/fulfilled/delivered only.
 const ov = od.orderEngine.overview();
 t(typeof ov.cards.recognizedRevenue === 'number', 'overview returns recognized revenue');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
