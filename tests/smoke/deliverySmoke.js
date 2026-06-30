// tests/smoke/deliverySmoke.js
// Offline smoke test for the delivery tracker. No model: updates use templates.
// Lifecycle, notifications, stuck detection, and terminal guards are exercised.
// Exit code 0 = pass.
//
// Run: node tests/smoke/deliverySmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template updates

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const del = require('../../lib/delivery/deliveryTracker');
const { templateUpdate, FLOW, TERMINAL } = del._internal;

function clear(storeId) {
  for (const s of ['_shipments.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'delivery', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'delivery_smoke';
  clear(STORE);

  // template phrasing per status
  assert.ok(/dispatched/i.test(templateUpdate({ trackingId: 'TX1', courier: 'TCS' }, 'dispatched'))); passed++;
  assert.ok(/out for delivery/i.test(templateUpdate({}, 'out_for_delivery'))); passed++;
  assert.ok(/delivered/i.test(templateUpdate({}, 'delivered'))); passed++;

  // create a shipment
  const c = del.createShipment({ storeId: STORE, orderId: 'O1', phone: '+92300', courier: 'TCS', trackingId: 'TX123' });
  assert.strictEqual(c.ok, true); assert.strictEqual(c.shipment.status, 'created'); passed++;
  // duplicate create blocked
  assert.strictEqual(del.createShipment({ storeId: STORE, orderId: 'O1', phone: '+92300' }).ok, false); passed++;

  // dispatched -> notification queued (config notifyOn includes dispatched)
  const u1 = await del.updateStatus({ storeId: STORE, orderId: 'O1', status: 'dispatched', etaISO: new Date(Date.now() + 2 * 86400000).toISOString() });
  assert.strictEqual(u1.ok, true); assert.ok(u1.notification && /dispatched/i.test(u1.notification.message)); passed++;
  let due = del.dueNotifications({ storeId: STORE });
  assert.ok(due.find(d => d.orderId === 'O1')); passed++;
  del.markNotified({ storeId: STORE, orderId: 'O1' });
  assert.ok(!del.dueNotifications({ storeId: STORE }).find(d => d.orderId === 'O1')); passed++;

  // in_transit (not in notifyOn by default) -> no notification
  const u2 = await del.updateStatus({ storeId: STORE, orderId: 'O1', status: 'in_transit' });
  assert.strictEqual(u2.notification, null); passed++;

  // delivered -> notification + terminal
  const u3 = await del.updateStatus({ storeId: STORE, orderId: 'O1', status: 'delivered' });
  assert.ok(u3.notification && /delivered/i.test(u3.notification.message)); passed++;
  // further updates blocked once terminal
  const u4 = await del.updateStatus({ storeId: STORE, orderId: 'O1', status: 'in_transit' });
  assert.strictEqual(u4.ok, false); passed++;

  // stuck detection: create a shipment and backdate its statusSince beyond SLA
  del.createShipment({ storeId: STORE, orderId: 'O2', phone: '+92301' });
  await del.updateStatus({ storeId: STORE, orderId: 'O2', status: 'dispatched' });
  // hack statusSince to 100h ago (dispatched SLA is 48h)
  const shipPath = path.join(__dirname, '..', '..', 'data', 'delivery', `${STORE}_shipments.json`);
  const data = JSON.parse(fs.readFileSync(shipPath, 'utf8'));
  data.O2.statusSince = Date.now() - 100 * 3600000; fs.writeFileSync(shipPath, JSON.stringify(data, null, 2));
  const stuck = del.stuckShipments({ storeId: STORE });
  assert.ok(stuck.find(s => s.orderId === 'O2'), 'O2 should be flagged stuck'); passed++;
  assert.ok(stuck[0].hoursInStatus >= stuck[0].slaHours); passed++;

  // trackForCustomer
  const t = await del.trackForCustomer({ storeId: STORE, orderId: 'O2' });
  assert.strictEqual(t.found, true); assert.ok(t.message.length); passed++;
  const tNo = await del.trackForCustomer({ storeId: STORE, orderId: 'NOPE' });
  assert.strictEqual(tNo.found, false); passed++;

  // unknown status / missing args throw
  let threw = false; try { await del.updateStatus({ storeId: STORE, orderId: 'O2', status: 'teleported' }); } catch { threw = true; }
  assert.ok(threw, 'unknown status should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 delivery smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c delivery smoke failed:', e); process.exit(1); });
