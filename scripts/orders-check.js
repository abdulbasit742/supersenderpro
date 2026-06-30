#!/usr/bin/env node
// scripts/orders-check.js — Offline safety + behavior check. Run: npm run orders:check

const od = require('../lib/orders');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(od && od.orderEngine, 'module loads');
 assert(od.config.liveMessages === false, 'status messages are draft-only by default (safe)');

 // Totals: 2x100 + 1x50 = 250 subtotal; 10% tax = 25; +20 shipping = 295.
 const q = od.totals.compute({ items: [{ name: 'Widget', qty: 2, unitPrice: 100 }, { name: 'Gadget', qty: 1, unitPrice: 50 }], taxPercent: 10, shippingFlat: 20 });
 assert(q.subtotal === 250 && q.tax === 25 && q.total === 295, 'totals computed correctly');

 // Create + place an order.
 const o = od.orderEngine.create({ contact: '+923001234567', name: 'Ali', items: [{ name: 'Widget', qty: 2, unitPrice: 100 }], taxPercent: 0, shippingFlat: 0 });
 assert(o.status === 'draft' && o.total === 200, 'order created as draft with correct total');
 assert(o.contactMasked.indexOf('1234567') === -1, 'contact masked in order view');

 const placed = await od.orderEngine.place(o.id);
 assert(placed.ok && placed.order.status === 'pending', 'draft order places -> pending');
 assert(placed.message.sent === false && placed.message.draft === true, 'order-placed message is drafted, not sent');

 // Illegal transition blocked: pending cannot jump straight to delivered.
 const bad = await od.orderEngine.deliver(o.id);
 assert(bad.ok === false && /cannot move/.test(bad.reason), 'illegal status jump (pending -> delivered) is blocked');

 // Pay -> fulfilled -> delivered happy path.
 const paid = await od.orderEngine.markPaid(o.id, { paymentRef: 'pi_123' });
 assert(paid.ok && paid.order.status === 'paid' && paid.order.paymentRef === 'pi_123', 'markPaid links the payment ref');
 const ful = await od.orderEngine.fulfill(o.id);
 assert(ful.ok && ful.order.status === 'fulfilled', 'paid -> fulfilled');
 const del = await od.orderEngine.deliver(o.id);
 assert(del.ok && del.order.status === 'delivered', 'fulfilled -> delivered');

 // History recorded each step.
 const fin = od.orderEngine.get(o.id);
 assert(fin.history.length >= 4, 'status history records each transition');

 // Empty order rejected.
 let threw = false; try { od.orderEngine.create({ contact: 'x', items: [] }); } catch (_e) { threw = true; }
 assert(threw, 'order with no line items is rejected');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all orders checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
