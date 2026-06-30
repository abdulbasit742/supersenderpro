'use strict';
/**
 * rateLimiter.js — API Feature #3: protect the public API from abuse.
 *
 * A token-bucket limiter keyed by identity (API key id > tenant > IP). Each identity gets a bucket
 * that refills at `ratePerMin`; a request costs 1 token. Empty bucket => 429 with Retry-After. Sets
 * standard X-RateLimit-* headers so well-behaved clients can back off.
 *
 * In-memory buckets (fine per-process). For multi-instance, back the bucket store with Redis using
 * the same interface. No external deps.
 */

const buckets = new Map(); // key -> { tokens, updatedAt }

let CONFIG = { ratePerMin: 120, burst: 60 }; // 120 req/min sustained, burst up to +60
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

function identityOf(req) {
  if (req.apiKey && req.apiKey.id) return `key:${req.apiKey.id}`;
  if (req.tenantId) return `tenant:${req.tenantId}`;
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  return `ip:${String(ip).split(',')[0].trim()}`;
}

function take(key, cost = 1, cfg = CONFIG) {
  const now = Date.now();
  const capacity = cfg.ratePerMin + cfg.burst;
  const refillPerMs = cfg.ratePerMin / 60000;
  let b = buckets.get(key);
  if (!b) { b = { tokens: capacity, updatedAt: now }; buckets.set(key, b); }
  // refill
  const elapsed = now - b.updatedAt;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerMs);
  b.updatedAt = now;
  if (b.tokens >= cost) {
    b.tokens -= cost;
    const resetMs = (capacity - b.tokens) / refillPerMs;
    return { allowed: true, remaining: Math.floor(b.tokens), limit: capacity, resetSec: Math.ceil(resetMs / 1000) };
  }
  const retryMs = (cost - b.tokens) / refillPerMs;
  return { allowed: false, remaining: 0, limit: capacity, retryAfterSec: Math.ceil(retryMs / 1000) };
}

/**
 * Express middleware. Optionally pass per-route overrides: rateLimit({ ratePerMin, burst }).
 */
function rateLimit(overrides = {}) {
  const cfg = { ...CONFIG, ...overrides };
  return function (req, res, next) {
    const key = identityOf(req);
    const r = take(key, 1, cfg);
    res.setHeader('X-RateLimit-Limit', r.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, r.remaining));
    if (!r.allowed) {
      res.setHeader('Retry-After', r.retryAfterSec);
      return res.status(429).json({ ok: false, error: 'rate limit exceeded', retryAfterSec: r.retryAfterSec });
    }
    res.setHeader('X-RateLimit-Reset', r.resetSec);
    next();
  };
}

/** Inspect current bucket for an identity (debug). */
function peek(key) {
  const b = buckets.get(key);
  return b ? { tokens: Math.floor(b.tokens), updatedAt: new Date(b.updatedAt).toISOString() } : null;
}

module.exports = { configure, rateLimit, take, identityOf, peek };
