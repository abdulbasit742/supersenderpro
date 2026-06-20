// lib/securityGateway/rateLimitStore.js — In-memory sliding window counters (no raw identifiers).
const buckets = new Map();

function hit(key, windowSeconds) {
  const now = Date.now();
  const winMs = Math.max(1, windowSeconds) * 1000;
  let b = buckets.get(key);
  if (!b || now - b.start >= winMs) { b = { start: now, count: 0 }; buckets.set(key, b); }
  b.count += 1;
  const resetInMs = winMs - (now - b.start);
  return { count: b.count, resetInSeconds: Math.ceil(resetInMs / 1000) };
}
function peek(key) { return buckets.get(key) || null; }
function reset(key) { return buckets.delete(key); }
function clearAll() { buckets.clear(); }

module.exports = { hit, peek, reset, clearAll };
