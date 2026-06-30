'use strict';
/**
 * lib/redis/cache.js - tiny shared cache with TTL. Redis when available, else in-memory.
 * Values are JSON-serialized. Good for hot reads that today re-read JSON files per request.
 */
const { getClient, available } = require('./client');

const mem = new Map(); // key -> { value, expiresAt }

async function set(key, value, ttlSec = 60) {
  const k = 'cache:' + key;
  const payload = JSON.stringify(value);
  if (available()) { await getClient().set(k, payload, 'EX', ttlSec); return true; }
  mem.set(k, { value: payload, expiresAt: Date.now() + ttlSec * 1000 });
  return true;
}

async function get(key) {
  const k = 'cache:' + key;
  if (available()) { const v = await getClient().get(k); return v ? JSON.parse(v) : null; }
  const hit = mem.get(k);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) { mem.delete(k); return null; }
  return JSON.parse(hit.value);
}

async function del(key) {
  const k = 'cache:' + key;
  if (available()) { await getClient().del(k); return true; }
  mem.delete(k); return true;
}

module.exports = { get, set, del };
