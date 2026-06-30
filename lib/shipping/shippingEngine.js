'use strict';
// #58 Shipping — orchestration: create/transition/track + optional cross-dept hooks.
const shipmentStore = require('./shipmentStore');
const notify = require('./notify');
const { CONFIG } = require('./config');

// Optional cross-dept hooks (degrade to no-op when sibling depts absent).
let orders = null;
try { orders = require('../orders'); } catch (_) { orders = null; }
let customer360 = null;
try { customer360 = require('../customer360'); } catch (_) { customer360 = null; }

function emit360(tenantId, contactId, event, meta) {
  if (!customer360 || typeof customer360.recordEvent !== 'function' || !contactId) return;
  try { customer360.recordEvent(tenantId, contactId, event, meta || {}); } catch (_) {}
}

function createShipment(tenantId, input) {
  const sh = shipmentStore.create(tenantId, input);
  emit360(tenantId, sh.contactId, 'shipment_created', { shipmentId: sh.id, orderId: sh.orderId });
  return { ok: true, shipment: sh };
}

function updateStatus(tenantId, id, to, note) {
  const res = shipmentStore.transition(tenantId, id, to, note);
  if (!res.ok) return res;
  const sh = res.shipment;
  const draft = res.changed ? notify.draftFor(tenantId, sh, to) : null;
  if (res.changed) {
    emit360(tenantId, sh.contactId, 'shipment_' + to, { shipmentId: sh.id });
    // When delivered, advise orders dept (no write if absent / no fn).
    if (to === 'delivered' && orders && typeof orders.markFulfilled === 'function' && sh.orderId) {
      try { orders.markFulfilled(tenantId, sh.orderId, { via: 'shipping', shipmentId: sh.id }); } catch (_) {}
    }
  }
  return { ok: true, shipment: sh, changed: res.changed, notification: draft };
}

function track(tenantId, id) {
  const sh = shipmentStore.get(tenantId, id);
  if (!sh) return { ok: false, error: 'not_found' };
  return {
    ok: true,
    id: sh.id,
    status: sh.status,
    carrier: sh.carrier,
    trackingNumber: sh.trackingNumber,
    history: sh.history,
    nextStates: CONFIG.TRANSITIONS[sh.status] || []
  };
}

module.exports = { createShipment, updateStatus, track, list: shipmentStore.list, get: shipmentStore.get };
