'use strict';
/**
 * lib/apiKeys/index.js - per-tenant API keys for programmatic/integration access.
 * Humans authenticate with JWT (lib/auth); machines use API keys.
 *
 * Security: the raw key is shown exactly once at issue time; only a sha256 hash is stored.
 * Verification hashes the presented key and matches. Keys are tenant-scoped (lib/db) and can
 * carry scopes. Prefix is stored in clear for display/identification ('sk_live_ab12...').
 */
const crypto = require('crypto');
const repo = require('../db');
const COLLECTION = 'api_keys';
const nowISO = () => new Date().toISOString();

const hash = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');

async function issue(tenantId, { name, scopes } = {}) {
  repo.assertTenant(tenantId);
  const raw = 'sk_' + crypto.randomBytes(24).toString('hex');
  const prefix = raw.slice(0, 11); // sk_ + 8 hex
  const row = await repo.create(tenantId, COLLECTION, {
    name: name || 'default', prefix, keyHash: hash(raw),
    scopes: Array.isArray(scopes) ? scopes : [], status: 'active', lastUsedAt: null,
  });
  // raw returned ONCE - never stored, never logged
  return { id: row.id, name: row.name, prefix, scopes: row.scopes, key: raw, createdAt: row.createdAt };
}

async function verify(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  const h = hash(rawKey);
  // scan tenants' keys: stored under each tenant; we don't know tenant yet, so the key itself must
  // resolve it. We keep a lightweight global index in the platform namespace for hash->tenant.
  const idx = await repo.list('__platform__', 'api_key_index', {});
  const hit = idx.find((r) => r.keyHash === h);
  if (!hit) return null;
  const row = await repo.get(hit.tenantId_ref, COLLECTION, hit.keyId);
  if (!row || row.status !== 'active') return null;
  repo.update(hit.tenantId_ref, COLLECTION, row.id, { lastUsedAt: nowISO() }).catch(() => {});
  return { tenantId: hit.tenantId_ref, keyId: row.id, scopes: row.scopes || [], name: row.name };
}

// issue() above stores per-tenant; we also index for O(1) verify. Wrap issue to keep them in sync.
const _issue = issue;
async function issueIndexed(tenantId, opts) {
  const result = await _issue(tenantId, opts);
  await repo.create('__platform__', 'api_key_index', { keyHash: hash(result.key), tenantId_ref: tenantId, keyId: result.id });
  return result;
}

async function list(tenantId) {
  repo.assertTenant(tenantId);
  const rows = await repo.list(tenantId, COLLECTION, {});
  return rows.map((r) => ({ id: r.id, name: r.name, prefix: r.prefix, scopes: r.scopes, status: r.status, lastUsedAt: r.lastUsedAt, createdAt: r.createdAt }));
}

async function revoke(tenantId, keyId) {
  repo.assertTenant(tenantId);
  const row = await repo.get(tenantId, COLLECTION, keyId);
  if (!row) return false;
  await repo.update(tenantId, COLLECTION, keyId, { status: 'revoked' });
  // remove from index so verify fails immediately
  const idx = await repo.list('__platform__', 'api_key_index', {});
  const hit = idx.find((r) => r.keyId === keyId && r.tenantId_ref === tenantId);
  if (hit) await repo.remove('__platform__', 'api_key_index', hit.id);
  return true;
}

module.exports = { issue: issueIndexed, verify, list, revoke, COLLECTION };
