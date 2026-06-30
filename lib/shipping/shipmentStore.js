'use strict';
// #58 Shipping — shipment CRUD + guarded status transitions.
const { readDb, writeDb, tenantBucket } = require('./store');
const { CONFIG } = require('./config');

function genId() {
  return 'shp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nowIso() { return new Date().toISOString(); }

function create(tenantId, input) {
  input = input || {};
  const db = readDb();
  const bucket = tenantBucket(db, tenantId);
  const carrier = CONFIG.CARRIERS.includes(input.carrier) ? input.carrier : CONFIG.DEFAULTS.carrier;
  const sh = {
    id: genId(),
    tenantId,
    orderId: input.orderId || null,
    contactId: input.contactId || null,
    carrier,
    trackingNumber: input.trackingNumber || null,
    toName: input.toName || null,
    toPhone: input.toPhone || null,
    toAddress: input.toAddress || null,
    status: 'label_created',
    history: [{ status: 'label_created', at: nowIso(), note: 'created' }],
    notifyCustomer: input.notifyCustomer != null ? !!input.notifyCustomer : CONFIG.DEFAULTS.notifyCustomer,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  bucket.shipments.push(sh);
  writeDb(db);
  return sh;
}

function get(tenantId, id) {
  const db = readDb();
  const bucket = tenantBucket(db, tenantId);
  return bucket.shipments.find(function (s) { return s.id === id; }) || null;
}

function list(tenantId, filter) {
  filter = filter || {};
  const db = readDb();
  const bucket = tenantBucket(db, tenantId);
  let out = bucket.shipments.slice();
  if (filter.status) out = out.filter(function (s) { return s.status === filter.status; });
  if (filter.orderId) out = out.filter(function (s) { return s.orderId === filter.orderId; });
  if (filter.contactId) out = out.filter(function (s) { return s.contactId === filter.contactId; });
  return out;
}

function canTransition(from, to) {
  const allowed = CONFIG.TRANSITIONS[from] || [];
  return allowed.indexOf(to) !== -1;
}

function transition(tenantId, id, to, note) {
  const db = readDb();
  const bucket = tenantBucket(db, tenantId);
  const sh = bucket.shipments.find(function (s) { return s.id === id; });
  if (!sh) return { ok: false, error: 'not_found' };
  if (sh.status === to) return { ok: true, shipment: sh, changed: false };
  if (!canTransition(sh.status, to)) {
    return { ok: false, error: 'invalid_transition', from: sh.status, to };
  }
  sh.status = to;
  sh.updatedAt = nowIso();
  sh.history.push({ status: to, at: nowIso(), note: note || null });
  writeDb(db);
  return { ok: true, shipment: sh, changed: true };
}

module.exports = { create, get, list, transition, canTransition };
