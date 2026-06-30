'use strict';
// #58 Shipping — self-check. No external calls; verifies module wiring + a dry round-trip.
const { CONFIG } = require('./config');
const engine = require('./shippingEngine');
const shipmentStore = require('./shipmentStore');

function run() {
  const checks = [];
  function ok(name, pass, info) { checks.push({ name, pass: !!pass, info: info || null }); }

  ok('config.statuses', Array.isArray(CONFIG.STATUSES) && CONFIG.STATUSES.length >= 4);
  ok('config.transitions', !!CONFIG.TRANSITIONS && !!CONFIG.TRANSITIONS.label_created);
  ok('engine.exports', typeof engine.createShipment === 'function' && typeof engine.updateStatus === 'function');

  // Dry round-trip on a throwaway tenant.
  try {
    const t = '__doctor__';
    const c = engine.createShipment(t, { orderId: 'o1', contactId: 'c1', carrier: 'tcs', trackingNumber: 'TN1', toPhone: '03001234567', toAddress: 'Street 1, City' });
    const moved = engine.updateStatus(t, c.shipment.id, 'in_transit', 'doctor');
    const bad = shipmentStore.transition(t, c.shipment.id, 'delivered', 'should fail (not out_for_delivery)');
    ok('roundtrip.create', c.ok && c.shipment.status === 'label_created');
    ok('roundtrip.transition', moved.ok && moved.shipment.status === 'in_transit');
    ok('roundtrip.guard', bad.ok === false && bad.error === 'invalid_transition');
    ok('roundtrip.notification', !!moved.notification && moved.notification.draft === true && moved.notification.autoSend === false);
  } catch (e) {
    ok('roundtrip', false, e.message);
  }

  const pass = checks.every(function (c) { return c.pass; });
  return { dept: 'shipping', pass, checks };
}

module.exports = { run };
