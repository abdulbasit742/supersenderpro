// lib/returns/returnStore.js
// CRUD + lifecycle helpers for RMA (Return Merchandise Authorization) records.
//
// Lifecycle: requested -> approved -> received -> refunded
//                       \-> rejected
//
// A return is always scoped to a tenantId and (optionally) an orderId.

'use strict';

const { readAll, writeAll } = require('./store');

const STATUSES = ['requested', 'approved', 'received', 'refunded', 'rejected'];

const TRANSITIONS = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded', 'rejected'],
  refunded: [],
  rejected: []
};

function genId() {
  return 'rma_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function requireTenant(tenantId) {
  if (!tenantId) throw new Error('returns: tenantId is required (tenant isolation)');
}

function list(tenantId, filter = {}) {
  requireTenant(tenantId);
  const { returns } = readAll();
  return returns.filter((r) => {
    if (r.tenantId !== tenantId) return false;
    if (filter.status && r.status !== filter.status) return false;
    if (filter.orderId && r.orderId !== filter.orderId) return false;
    return true;
  });
}

function get(tenantId, id) {
  requireTenant(tenantId);
  const { returns } = readAll();
  return returns.find((r) => r.tenantId === tenantId && r.id === id) || null;
}

function create(tenantId, payload) {
  requireTenant(tenantId);
  const data = readAll();
  const now = new Date().toISOString();
  const rec = {
    id: genId(),
    tenantId,
    orderId: payload.orderId || null,
    customer: payload.customer || null,
    lineItems: Array.isArray(payload.lineItems) ? payload.lineItems : [],
    reason: payload.reason || 'unspecified',
    status: 'requested',
    refund: null,
    notes: payload.notes || '',
    history: [{ at: now, status: 'requested', by: payload.by || 'system' }],
    createdAt: now,
    updatedAt: now
  };
  data.returns.push(rec);
  writeAll(data);
  return rec;
}

function transition(tenantId, id, nextStatus, meta = {}) {
  requireTenant(tenantId);
  if (!STATUSES.includes(nextStatus)) {
    throw new Error(`returns: unknown status "${nextStatus}"`);
  }
  const data = readAll();
  const rec = data.returns.find((r) => r.tenantId === tenantId && r.id === id);
  if (!rec) throw new Error('returns: RMA not found');
  const allowed = TRANSITIONS[rec.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`returns: illegal transition ${rec.status} -> ${nextStatus}`);
  }
  const now = new Date().toISOString();
  rec.status = nextStatus;
  rec.updatedAt = now;
  if (meta.refund) rec.refund = meta.refund;
  if (meta.notes) rec.notes = meta.notes;
  rec.history.push({ at: now, status: nextStatus, by: meta.by || 'system' });
  writeAll(data);
  return rec;
}

module.exports = { STATUSES, TRANSITIONS, list, get, create, transition };
