'use strict';
/**
 * rateLimiter.js — API Feature #3: rate limiting for the public API.
 *
 * The public /api/v1 (api #1) is open to customers' own code — a buggy loop or abuse could hammer
 * the server. This is a sliding-window limiter keyed per API key (falling back to IP). It returns
 * 429 with standard headers so well-behaved clients back off.
 *
 * In-memory counters (per process). For multi-instance, back the windows with Redis using the same
 * shape — the middleware signature stays identical.
 */

const WINDOWS = new Map(); // key -> number[] (timestamps within window)

function prune(arr, windowMs, now) {
  const cutoff = now - windowMs;
  let i = 0;
  while (i < arr.length && arr[i] < cutoff) i++;
  return i ? arr.slice(i) : arr;
}

/**
 * Create a limiter middleware.
 * @param {Object} opts { windowMs?=60000, max?=120, keyFn?, name? }
 *   keyFn(req) -> string identity (default: API key id or IP)
 */
function rateLimit(opts = {}) {
  const windowMs = Number(opts.windowMs || 60000);
  const max = Number(opts.max || 120);
  const name = opts.name || 'api';
  const keyFn = typeof opts.keyFn === 'function'
    ? opts.keyFn
    : (req) => (req.apiKey && req.apiKey.id) || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon';

  return function (req, res, next) {
    const id = `${name}:${keyFn(req)}`;
    const now = Date.now();
    const hits = prune(WINDOWS.get(id) || [], windowMs, now);

    const remaining = Math.max(0, max - hits.length);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining - 1)));
    res.setHeader('X-RateLimit-Window', String(Math.round(windowMs / 1000)));

    if (hits.length >= max) {
      const retryMs = windowMs - (now - hits[0]);
      res.setHeader('Retry-After', String(Math.ceil(retryMs / 1000)));
      WINDOWS.set(id, hits);
      return res.status(429).json({ ok: false, error: 'rate limit exceeded', retryAfterSec: Math.ceil(retryMs / 1000) });
    }

    hits.push(now);
    WINDOWS.set(id, hits);
    next();
  };
}

// Periodic cleanup so the map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of WINDOWS.entries()) {
    const pruned = prune(arr, 3600000, now); // drop anything older than an hour
    if (pruned.length) WINDOWS.set(k, pruned); else WINDOWS.delete(k);
  }
}, 600000).unref?.();

module.exports = { rateLimit };
