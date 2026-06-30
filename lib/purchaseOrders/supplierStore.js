// lib/purchaseOrders/supplierStore.js
// Supplier records, tenant-scoped.

'use strict';

const { readJson, writeJson, nextId } = require('./store');
const { SUPPLIERS_FILE } = require('./config');

function requireTenant(tenantId) {
  if (!tenantId) throw new Error('tenantId required');
  return String(tenantId);
}

function loadAll() {
  return readJson(SUPPLIERS_FILE, {});
}

function listSuppliers(tenantId) {
  const t = requireTenant(tenantId);
  const all = loadAll();
  return Object.values(all[t] || {});
}

function getSupplier(tenantId, id) {
  const t = requireTenant(tenantId);
  const all = loadAll();
  return (all[t] || {})[id] || null;
}

function createSupplier(tenantId, data) {
  const t = requireTenant(tenantId);
  if (!data || !data.name) throw new Error('supplier name required');
  const all = loadAll();
  all[t] = all[t] || {};
  const id = nextId('sup');
  const now = new Date().toISOString();
  const rec = {
    id,
    tenantId: t,
    name: String(data.name),
    email: data.email || null,
    phone: data.phone || null,
    leadTimeDays: Number(data.leadTimeDays || 0),
    notes: data.notes || '',
    active: data.active !== false,
    createdAt: now,
    updatedAt: now
  };
  all[t][id] = rec;
  writeJson(SUPPLIERS_FILE, all);
  return rec;
}

function updateSupplier(tenantId, id, patch) {
  const t = requireTenant(tenantId);
  const all = loadAll();
  const rec = (all[t] || {})[id];
  if (!rec) throw new Error('supplier not found');
  const allowed = ['name', 'email', 'phone', 'leadTimeDays', 'notes', 'active'];
  for (const k of allowed) {
    if (patch && Object.prototype.hasOwnProperty.call(patch, k)) rec[k] = patch[k];
  }
  rec.updatedAt = new Date().toISOString();
  all[t][id] = rec;
  writeJson(SUPPLIERS_FILE, all);
  return rec;
}

module.exports = { listSuppliers, getSupplier, createSupplier, updateSupplier };
