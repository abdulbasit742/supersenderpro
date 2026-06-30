'use strict';
/**
 * lib/db/index.js - Phase 1 data-access layer (the service-layer seam).
 *
 * Goal from the roadmap: ONE source of truth + HARD tenant boundaries, with a clean
 * swap path from JSON files to Postgres. Routes/services call this repository instead
 * of touching fs or Prisma directly, so the storage engine can change underneath them.
 *
 * Driver selection via DB_DRIVER:
 *   - 'json' (default): uses the existing data/*.json convention. Nothing breaks today.
 *   - 'postgres': uses Prisma (requires `npx prisma generate` + DATABASE_URL).
 *
 * HARD RULE: every method takes tenantId first. Calls without a tenantId throw.
 * This is the enforcement point for multi-tenant isolation.
 */
const path = require('path');
const fs = require('fs');

const DRIVER = (process.env.DB_DRIVER || 'json').toLowerCase();
const DATA_DIR = path.join(__dirname, '../../data/tenant_store');

function assertTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required for every data-access call (tenant isolation)');
  }
  return tenantId;
}

/* ----------------------------- JSON driver ----------------------------- */
// Stores rows as data/tenant_store/<tenantId>/<collection>.json. Tenant in the
// path makes cross-tenant reads structurally impossible.
function jsonDriver() {
  const fileFor = (tenantId, collection) => path.join(DATA_DIR, tenantId, collection + '.json');
  const ensure = (tenantId) => { fs.mkdirSync(path.join(DATA_DIR, tenantId), { recursive: true }); };
  const load = (tenantId, collection) => {
    const f = fileFor(tenantId, collection);
    try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; } catch { return []; }
  };
  const save = (tenantId, collection, rows) => { ensure(tenantId); fs.writeFileSync(fileFor(tenantId, collection), JSON.stringify(rows, null, 2)); };
  const rid = () => 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  return {
    driver: 'json',
    async list(tenantId, collection, where = {}) {
      assertTenant(tenantId);
      return load(tenantId, collection).filter((row) => Object.entries(where).every(([k, v]) => row[k] === v));
    },
    async get(tenantId, collection, id) {
      assertTenant(tenantId);
      return load(tenantId, collection).find((r) => r.id === id) || null;
    },
    async create(tenantId, collection, data) {
      assertTenant(tenantId);
      const rows = load(tenantId, collection);
      const row = Object.assign({ id: rid(), tenantId, createdAt: new Date().toISOString() }, data, { tenantId });
      rows.push(row); save(tenantId, collection, rows); return row;
    },
    async update(tenantId, collection, id, patch) {
      assertTenant(tenantId);
      const rows = load(tenantId, collection);
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      Object.assign(row, patch, { tenantId, updatedAt: new Date().toISOString() });
      save(tenantId, collection, rows); return row;
    },
    async remove(tenantId, collection, id) {
      assertTenant(tenantId);
      const rows = load(tenantId, collection);
      const next = rows.filter((r) => r.id !== id);
      save(tenantId, collection, next); return rows.length !== next.length;
    },
    async ping() { fs.mkdirSync(DATA_DIR, { recursive: true }); return { ok: true, driver: 'json', dir: DATA_DIR }; },
  };
}

/* --------------------------- Postgres driver --------------------------- */
// Thin wrapper over Prisma. Collection name maps to a Prisma model delegate.
// Every where-clause is force-merged with { tenantId } so isolation can't be bypassed.
function postgresDriver() {
  let prisma = null;
  const client = () => {
    if (prisma) return prisma;
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    return prisma;
  };
  const MODEL = {
    customers: 'customer', orders: 'order', quotes: 'quote',
    inbox_messages: 'inboxMessage', txns: 'txn', webhook_endpoints: 'webhookEndpoint', follow_ups: 'followUp',
  };
  const delegate = (collection) => {
    const name = MODEL[collection] || collection;
    const d = client()[name];
    if (!d) throw new Error('Unknown collection/model: ' + collection);
    return d;
  };
  return {
    driver: 'postgres',
    async list(tenantId, collection, where = {}) { assertTenant(tenantId); return delegate(collection).findMany({ where: Object.assign({}, where, { tenantId }) }); },
    async get(tenantId, collection, id) { assertTenant(tenantId); const row = await delegate(collection).findFirst({ where: { id, tenantId } }); return row || null; },
    async create(tenantId, collection, data) { assertTenant(tenantId); return delegate(collection).create({ data: Object.assign({}, data, { tenantId }) }); },
    async update(tenantId, collection, id, patch) {
      assertTenant(tenantId);
      const existing = await delegate(collection).findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      return delegate(collection).update({ where: { id }, data: Object.assign({}, patch, { tenantId }) });
    },
    async remove(tenantId, collection, id) {
      assertTenant(tenantId);
      const existing = await delegate(collection).findFirst({ where: { id, tenantId } });
      if (!existing) return false;
      await delegate(collection).delete({ where: { id } }); return true;
    },
    async ping() { await client().$queryRaw`SELECT 1`; return { ok: true, driver: 'postgres' }; },
  };
}

const repo = DRIVER === 'postgres' ? postgresDriver() : jsonDriver();

module.exports = Object.assign({}, repo, { DRIVER, assertTenant });
