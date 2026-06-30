'use strict';
/**
 * lib/redis/lock.js - distributed lock (Redlock-lite). Replaces the in-process stock mutex
 * (lib/stockMutex.js) so stock decrements / order fulfilment are safe across multiple instances.
 *
 * Redis path: SET key token NX PX ttl ; release only if token matches (atomic Lua) -> no one
 * else's lock gets deleted. Memory path: a per-process Map, correct for single instance.
 */
const crypto = require('crypto');
const { getClient, available } = require('./client');

const memLocks = new Map(); // key -> { token, expiresAt }
const RELEASE_LUA = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

function newToken() { return crypto.randomBytes(16).toString('hex'); }

async function acquire(key, ttlMs = 10000) {
  const k = 'lock:' + key;
  const token = newToken();
  if (available()) {
    const c = getClient();
    const ok = await c.set(k, token, 'PX', ttlMs, 'NX');
    return ok ? token : null;
  }
  const now = Date.now();
  const cur = memLocks.get(k);
  if (cur && cur.expiresAt > now) return null;
  memLocks.set(k, { token, expiresAt: now + ttlMs });
  return token;
}

async function release(key, token) {
  const k = 'lock:' + key;
  if (available()) {
    try { const c = getClient(); const res = await c.eval(RELEASE_LUA, 1, k, token); return res === 1; }
    catch { return false; }
  }
  const cur = memLocks.get(k);
  if (cur && cur.token === token) { memLocks.delete(k); return true; }
  return false;
}

// Convenience: run fn while holding the lock; auto-releases. Throws if lock not acquired.
async function withLock(key, fn, { ttlMs = 10000, retries = 20, retryDelayMs = 100 } = {}) {
  let token = null;
  for (let i = 0; i <= retries; i++) {
    token = await acquire(key, ttlMs);
    if (token) break;
    await new Promise((r) => setTimeout(r, retryDelayMs));
  }
  if (!token) throw new Error('could not acquire lock: ' + key);
  try { return await fn(); }
  finally { await release(key, token); }
}

module.exports = { acquire, release, withLock };
