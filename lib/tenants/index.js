'use strict';
/**
 * lib/tenants/index.js - tenant lifecycle for the multi-tenant SaaS.
 * Auth (users), billing (subscriptions) and the data layer were all tenant-scoped, but there
 * was no first-class way to create/list/suspend a tenant. This fills that gap.
 *
 * Tenants are stored in a dedicated 'platform' namespace (tenantId='__platform__') of the same
 * repository, so we reuse lib/db without weakening isolation for real tenants.
 */
const repo = require('../db');

const PLATFORM = '__platform__'; // reserved namespace for cross-tenant platform records
const COLLECTION = 'tenants';
const nowISO = () => new Date().toISOString();

function publicTenant(t) {
  return t ? { id: t.tenantId_ref || t.id, name: t.name, status: t.status, planId: t.planId || 'free', createdAt: t.createdAt, suspendedAt: t.suspendedAt || null } : null;
}

async function createTenant({ id, name, planId } = {}) {
  if (!name) throw new Error('tenant name required');
  const ref = id || ('t_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
  const existing = (await repo.list(PLATFORM, COLLECTION, {})).find((t) => (t.tenantId_ref || t.id) === ref);
  if (existing) throw new Error('tenant already exists: ' + ref);
  const row = await repo.create(PLATFORM, COLLECTION, { tenantId_ref: ref, name, planId: planId || 'free', status: 'active' });
  return publicTenant(row);
}

async function listTenants(filter = {}) {
  let rows = await repo.list(PLATFORM, COLLECTION, {});
  if (filter.status) rows = rows.filter((t) => t.status === filter.status);
  return rows.map(publicTenant);
}

async function getTenant(ref) {
  const rows = await repo.list(PLATFORM, COLLECTION, {});
  return publicTenant(rows.find((t) => (t.tenantId_ref || t.id) === ref) || null);
}

async function _rowFor(ref) {
  const rows = await repo.list(PLATFORM, COLLECTION, {});
  return rows.find((t) => (t.tenantId_ref || t.id) === ref) || null;
}

async function setStatus(ref, status, extra = {}) {
  const row = await _rowFor(ref);
  if (!row) throw new Error('tenant not found: ' + ref);
  const updated = await repo.update(PLATFORM, COLLECTION, row.id, Object.assign({ status }, extra));
  return publicTenant(updated);
}

const suspend = (ref, reason) => setStatus(ref, 'suspended', { suspendedAt: nowISO(), suspendReason: reason || '' });
const resume = (ref) => setStatus(ref, 'active', { suspendedAt: null, suspendReason: null });

async function setPlan(ref, planId) {
  const row = await _rowFor(ref);
  if (!row) throw new Error('tenant not found: ' + ref);
  return publicTenant(await repo.update(PLATFORM, COLLECTION, row.id, { planId }));
}

async function isActive(ref) {
  const t = await getTenant(ref);
  return !!(t && t.status === 'active');
}

module.exports = { createTenant, listTenants, getTenant, suspend, resume, setPlan, setStatus, isActive, PLATFORM };
