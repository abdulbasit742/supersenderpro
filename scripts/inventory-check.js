#!/usr/bin/env node
// scripts/inventory-check.js — Offline safety + behavior check. Run: npm run inventory:check

const iv = require('../lib/inventory');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(iv && iv.stockEngine, 'module loads');
 assert(iv.config.allowOversell === false, 'oversell blocked by default (safe)');

 // Create a product with 5 on hand.
 const p = iv.productStore.upsert({ sku: 'widget-1', name: 'Widget', onHand: 5, lowStockThreshold: 2 });
 assert(p.sku === 'WIDGET-1' && p.available === 5, 'product created (sku upper-cased), available = onHand');

 // Reserve 3 -> available 2, on-hand still 5.
 const r1 = await iv.stockEngine.reserve({ sku: 'widget-1', qty: 3, orderId: 'o1' });
 assert(r1.ok && r1.available === 2, 'reserve holds stock (available drops, on-hand unchanged)');
 assert(iv.productStore.get('WIDGET-1').onHand === 5, 'on-hand unchanged by reservation');

 // Over-reserve beyond available -> rejected (no oversell).
 const r2 = await iv.stockEngine.reserve({ sku: 'widget-1', qty: 5, orderId: 'o2' });
 assert(r2.ok === false && /insufficient/.test(r2.reason), 'cannot reserve more than available');

 // Commit the first reservation -> on-hand 2, reserved cleared.
 const c1 = await iv.stockEngine.commit(r1.reservationId);
 assert(c1.ok && c1.onHand === 2 && c1.available === 2, 'commit decrements on-hand by reserved qty');

 // Release flow: reserve 1 then release it -> available restored.
 const r3 = await iv.stockEngine.reserve({ sku: 'widget-1', qty: 1, orderId: 'o3' });
 const beforeRel = iv.productStore.get('WIDGET-1').available;
 const rel = iv.stockEngine.release(r3.reservationId);
 assert(rel.ok && iv.productStore.get('WIDGET-1').available === beforeRel + 1, 'release returns reserved stock to available');

 // Restock + low-stock detection.
 iv.stockEngine.restock('widget-1', 1, 'purchase'); // available now 3
 const low = iv.productStore.upsert({ sku: 'rare-1', name: 'Rare', onHand: 1, lowStockThreshold: 2 });
 assert(low.low === true && low.outOfStock === false, 'low-stock detected when available <= threshold');

 // Out of stock when available hits 0.
 const oosRes = await iv.stockEngine.reserve({ sku: 'rare-1', qty: 1, orderId: 'o4' });
 await iv.stockEngine.commit(oosRes.reservationId);
 const oos = iv.productStore.get('RARE-1');
 assert(oos.outOfStock === true && oos.available === 0, 'product is out of stock at available 0');

 // Order-level reservation rolls back on partial failure.
 iv.productStore.upsert({ sku: 'A', onHand: 10 });
 iv.productStore.upsert({ sku: 'B', onHand: 1 });
 const ro = await iv.stockEngine.reserveOrder('ord-x', [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 5 }]);
 assert(ro.ok === false && ro.failedSku === 'B', 'reserveOrder fails when any line cannot be reserved');
 assert(iv.productStore.get('A').available === 10, 'partial reservations rolled back (A back to 10)');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all inventory checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
