'use strict';
/**
 * lib/redis/client.js - lazy, optional Redis connection shared across the app.
 *
 * If REDIS_URL is unset (or ioredis isn't installed), `getClient()` returns null and every
 * consumer (lock/rateLimit/cache) transparently falls back to in-process memory. That keeps
 * single-instance dev working today, and flips to true shared state the moment REDIS_URL is set
 * - which is what makes running 2+ app instances safe (the Phase 1 goal).
 */
let Redis = null;
try { Redis = require('ioredis'); } catch { Redis = null; }

const URL = process.env.REDIS_URL || '';
let client = null;
let warned = false;

function available() { return !!(URL && Redis); }

function getClient() {
  if (!available()) {
    if (!warned) { console.warn('[Redis] REDIS_URL unset or ioredis missing - using in-memory fallback (single-instance only)'); warned = true; }
    return null;
  }
  if (client) return client;
  client = new Redis(URL, { maxRetriesPerRequest: 2, enableOfflineQueue: false, lazyConnect: false });
  client.on('error', (e) => console.error('[Redis] error:', e.message));
  client.on('connect', () => console.log('[Redis] connected'));
  return client;
}

async function healthz() {
  if (!available()) return { ok: true, mode: 'memory', note: 'REDIS_URL unset' };
  try { const c = getClient(); const pong = await c.ping(); return { ok: pong === 'PONG', mode: 'redis' }; }
  catch (e) { return { ok: false, mode: 'redis', error: e.message }; }
}

module.exports = { getClient, available, healthz };
