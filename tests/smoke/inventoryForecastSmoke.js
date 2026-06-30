// tests/smoke/inventoryForecastSmoke.js
// Offline smoke test for the inventory forecaster. No model: alerts use
// templates; velocity / days-of-cover / reorder math is exercised directly.
// Exit code 0 = pass.
//
// Run: node tests/smoke/inventoryForecastSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template alerts

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const inv = require('../../lib/inventory/inventoryForecast');
const { unitsPerDay, norm } = inv._internal;

function clear(storeId) {
  for (const s of ['_stock.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'inventory', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'inv_smoke';
  clear(STORE);
  const DAY = 86400000;
  const now = Date.now();

  // norm
  assert.strictEqual(norm('  Red  Shirt '), 'red shirt'); passed++;

  // unitsPerDay: 20 units over ~10 days -> ~2/day
  const sales = Array.from({ length: 10 }, (_, i) => ({ ts: now - (i + 1) * DAY, qty: 2 }));
  const v = unitsPerDay(sales, 30);
  assert.ok(v >= 1.5 && v <= 2.5, `expected ~2/day, got ${v}`); passed++;

  // set stock + record sales -> stock decrements
  inv.setStock({ storeId: STORE, product: 'Widget', onHand: 100 });
  const s1 = inv.recordSale({ storeId: STORE, product: 'Widget', qty: 5 });
  assert.strictEqual(s1.onHand, 95); passed++;

  // build velocity history then forecast
  for (let i = 1; i <= 20; i++) inv.recordSale({ storeId: STORE, product: 'Widget', qty: 3, ts: now - i * DAY });
  const f = inv.forecast({ storeId: STORE, product: 'Widget' });
  assert.ok(f.unitsPerDay > 0); passed++;
  assert.ok(f.daysOfCover != null && f.daysOfCover > 0); passed++;
  assert.ok(f.reorderPoint >= 0 && f.suggestedQty >= 0); passed++;
  assert.ok(['healthy', 'low', 'stockout', 'idle', 'out'].includes(f.status)); passed++;

  // force a low-stock situation -> status low + needsReorder
  inv.setStock({ storeId: STORE, product: 'Widget', onHand: 2 });
  const low = inv.forecast({ storeId: STORE, product: 'Widget' });
  assert.ok(low.status === 'low' || low.status === 'stockout'); passed++;
  assert.strictEqual(low.needsReorder, true); passed++;
  assert.ok(low.suggestedQty > 0); passed++;

  // stockout
  inv.setStock({ storeId: STORE, product: 'Widget', onHand: 0 });
  const out = inv.forecast({ storeId: STORE, product: 'Widget' });
  assert.strictEqual(out.status, 'stockout'); passed++;

  // inStock check
  inv.setStock({ storeId: STORE, product: 'Widget', onHand: 4 });
  assert.strictEqual(inv.inStock({ storeId: STORE, product: 'Widget', qty: 3 }).available, true); passed++;
  assert.strictEqual(inv.inStock({ storeId: STORE, product: 'Widget', qty: 10 }).available, false); passed++;

  // alertMessage (fallback) produces a line
  const a = await inv.alertMessage({ storeId: STORE, product: 'Widget' });
  assert.ok(a.message && a.message.length); assert.strictEqual(a.source, 'fallback'); passed++;

  // forecastAll only-alerts surfaces the low/out product
  inv.setStock({ storeId: STORE, product: 'Calm Item', onHand: 100000 });
  inv.recordSale({ storeId: STORE, product: 'Calm Item', qty: 1, ts: now - 60 * DAY }); // ancient sale -> ~0 velocity
  const alerts = inv.forecastAll({ storeId: STORE, onlyAlerts: true });
  assert.ok(alerts.find(x => x.product === 'widget')); passed++;

  // missing args throw
  let threw = false; try { inv.setStock({ storeId: STORE, product: 'X' }); } catch { threw = true; }
  assert.ok(threw, 'setStock without onHand should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 inventoryForecast smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c inventoryForecast smoke failed:', e); process.exit(1); });
