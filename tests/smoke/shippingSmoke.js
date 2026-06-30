'use strict';
// #58 Shipping — smoke test. Usage: node tests/smoke/shippingSmoke.js
const assert = require('assert');
const shipping = require('../../lib/shipping');

const T = '__smoke_shipping__';
let failures = 0;
function check(name, fn) {
  try { fn(); console.log('ok  - ' + name); }
  catch (e) { failures++; console.log('NOT - ' + name + ' :: ' + e.message); }
}

check('create shipment', function () {
  const r = shipping.createShipment(T, { orderId: 'O-1', contactId: 'C-1', carrier: 'leopards', trackingNumber: 'LE123', toPhone: '03009998877', toAddress: 'House 1, Lahore' });
  assert(r.ok && r.shipment.status === 'label_created');
});

check('valid transition + draft notification', function () {
  const c = shipping.createShipment(T, { contactId: 'C-2', carrier: 'tcs' });
  const m = shipping.updateStatus(T, c.shipment.id, 'in_transit', 'picked up');
  assert(m.ok && m.changed && m.shipment.status === 'in_transit');
  assert(m.notification && m.notification.draft === true && m.notification.autoSend === false);
});

check('invalid transition blocked', function () {
  const c = shipping.createShipment(T, { contactId: 'C-3' });
  const m = shipping.updateStatus(T, c.shipment.id, 'delivered', 'skip');
  assert(m.ok === false && m.error === 'invalid_transition');
});

check('full happy path to delivered', function () {
  const c = shipping.createShipment(T, { contactId: 'C-4' });
  shipping.updateStatus(T, c.shipment.id, 'in_transit');
  shipping.updateStatus(T, c.shipment.id, 'out_for_delivery');
  const d = shipping.updateStatus(T, c.shipment.id, 'delivered');
  assert(d.ok && d.shipment.status === 'delivered');
  const tr = shipping.track(T, c.shipment.id);
  assert(tr.ok && tr.history.length === 4);
});

check('tenant required', function () {
  let threw = false;
  try { shipping.createShipment('', {}); } catch (_) { threw = true; }
  assert(threw === true);
});

if (failures) { console.log('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nall shipping smoke checks passed');
