'use strict';
/**
 * lib/redis/rateLimit.js - fixed-window rate limiter, shared across instances via Redis.
 * Atomic INCR + EXPIRE on first hit. Memory fallback when Redis is unconfigured.
 * Returns { allowed, count, limit, remaining, resetMs }.
 */
const { getClient, available } = require('./client');

const memWindows = new Map(); // key -> { count, resetAt }

async function hit(key, limit = 60, windowSec = 60) {
  const k = 'rl:' + key;
  if (available()) {
    const c = getClient();
    const count = await c.incr(k);
    if (count === 1) await c.expire(k, windowSec);
    const ttl = await c.pttl(k);
    return { allowed: count <= limit, count, limit, remaining: Math.max(0, limit - count), resetMs: ttl > 0 ? ttl : windowSec * 1000 };
  }
  const now = Date.now();
  let w = memWindows.get(k);
  if (!w || w.resetAt <= now) { w = { count: 0, resetAt: now + windowSec * 1000 }; memWindows.set(k, w); }
  w.count++;
  return { allowed: w.count <= limit, count: w.count, limit, remaining: Math.max(0, limit - w.count), resetMs: w.resetAt - now };
}

// Express middleware factory. keyFn defaults to client IP.
function middleware({ limit = 60, windowSec = 60, keyFn } = {}) {
  return (req, res, next) => {
    (async () => {
      try {
        const key = (keyFn ? keyFn(req) : (req.ip || (req.headers && req.headers['x-forwarded-for']) || 'global'));
        const r = await hit('http:' + key, limit, windowSec);
        res.set('X-RateLimit-Limit', String(limit));
        res.set('X-RateLimit-Remaining', String(r.remaining));
        if (!r.allowed) return res.status(429).json({ success: false, error: 'rate limit exceeded', retryMs: r.resetMs });
        next();
      } catch { next(); }
    })();
  };
}

module.exports = { hit, middleware };
