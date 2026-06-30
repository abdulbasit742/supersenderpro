#!/usr/bin/env node
// tests/smoke/inventorySmoke.js — Smoke test for ledger + overview + oversell toggle. Run: npm run inventory:smoke

const iv = require('../../lib/inventory');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!iv.stockEngine, 'engine present');

 // Ledger records each movement with before/after available.
 iv.productStore.upsert({ sku: 'sm-1', name: 'Smoke', onHand: 4 });
 const r = await iv.stockEngine.reserve({ sku: 'sm-1', qty: 2, orderId: 'so1' });
 await iv.stockEngine.commit(r.reservationId);
 const led = iv.ledger.forSku('sm-1', 10);
 t(led.length >= 2 && led.some((m) => m.type === 'reserve') && led.some((m) => m.type === 'commit'), 'ledger records reserve + commit');
 t(led[0].beforeAvailable !== undefined && led[0].afterAvailable !== undefined, 'ledger entries carry before/after available');

 // Overview rolls up totals.
 const ov = iv.stockEngine.overview();
 t(typeof ov.cards.totalOnHand === 'number' && typeof ov.cards.outOfStock === 'number', 'overview returns stock totals');

 // Oversell toggle: with oversell ON, a reserve beyond available succeeds (negative available clamps at 0 in view).
 process.env.INVENTORY_ALLOW_OVERSELL = 'true';
 delete require.cache[require.resolve('../../lib/inventory/config')];
 delete require.cache[require.resolve('../../lib/inventory/stockEngine')];
 delete require.cache[require.resolve('../../lib/inventory/productStore')];
 delete require.cache[require.resolve('../../lib/inventory')];
 const iv2 = require('../../lib/inventory');
 iv2.productStore.upsert({ sku: 'os-1', name: 'Oversell', onHand: 1 });
 const big = await iv2.stockEngine.reserve({ sku: 'os-1', qty: 5, orderId: 'os-o' });
 t(big.ok === true, 'with oversell enabled, reserving beyond available is allowed');

 // adjust down records a movement.
 const adj = await iv2.stockEngine.adjust('os-1', -1, 'shrinkage');
 t(adj.sku === 'OS-1', 'adjust returns the updated product');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
