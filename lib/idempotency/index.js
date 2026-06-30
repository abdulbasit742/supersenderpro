'use strict';
/**
 * lib/idempotency/index.js - idempotency-key store for safe POST retries.
 * Backed by lib/redis cache (shared across instances; in-memory fallback otherwise).
 *
 * Flow: begin(key) reserves the key. If it's new -> {state:'new'}. If a result is already
 * stored -> {state:'done', response}. If reserved but not finished -> {state:'pending'} (a
 * concurrent duplicate; caller should 409). complete(key, response) stores the final result.
 *
 * Keys are namespaced per tenant so two tenants using the same client key never collide.
 */
const cache = require('../redis/cache');
const TTL_SEC = Number(process.env.IDEMPOTENCY_TTL_SEC || 86400); // 24h

const k = (tenantId, key) => 'idem:' + (tenantId || 'default') + ':' + key;

async function begin(tenantId, key) {
  if (!key) return { state: 'skip' };
  const existing = await cache.get(k(tenantId, key));
  if (existing && existing.status === 'done') return { state: 'done', response: existing.response };
  if (existing && existing.status === 'pending') return { state: 'pending' };
  await cache.set(k(tenantId, key), { status: 'pending', at: Date.now() }, TTL_SEC);
  return { state: 'new' };
}

async function complete(tenantId, key, response) {
  if (!key) return false;
  await cache.set(k(tenantId, key), { status: 'done', response, at: Date.now() }, TTL_SEC);
  return true;
}

async function release(tenantId, key) { if (key) await cache.del(k(tenantId, key)); }

module.exports = { begin, complete, release };
