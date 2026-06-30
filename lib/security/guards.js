'use strict';
/**
 * lib/security/guards.js - reusable rate-limit middleware presets.
 * Built on lib/redis rateLimit (shared across instances via Redis, memory fallback otherwise).
 *
 * Keying strategy: prefer tenant (req.tenantId) when present, else client IP. This means an
 * authenticated tenant gets its own budget; anonymous traffic is limited per IP.
 */
const rl = require('../redis/rateLimit');

const ipOf = (req) => req.ip || (req.headers && (req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || 'unknown';
const tenantOrIp = (req) => (req.tenantId ? 'tenant:' + req.tenantId : 'ip:' + ipOf(req));

// Generic factory with a name so different presets don't share buckets.
function guard(name, { limit, windowSec, keyFn } = {}) {
  const key = keyFn || tenantOrIp;
  return (req, res, next) => {
    (async () => {
      try {
        const r = await rl.hit(name + ':' + key(req), limit, windowSec);
        res.set('X-RateLimit-Limit', String(limit));
        res.set('X-RateLimit-Remaining', String(r.remaining));
        res.set('X-RateLimit-Reset', String(Math.ceil(r.resetMs / 1000)));
        if (!r.allowed) return res.status(429).json({ success: false, error: 'rate limit exceeded', scope: name, retryMs: r.resetMs });
        next();
      } catch { next(); } // never block traffic on limiter failure
    })();
  };
}

// Presets (override via env without code changes).
const N = (v, d) => Number(v || d);
const authGuard = guard('auth', { limit: N(process.env.RL_AUTH_LIMIT, 10), windowSec: N(process.env.RL_AUTH_WINDOW, 60), keyFn: (req) => 'ip:' + ipOf(req) }); // brute-force protection: always per-IP
const webhookGuard = guard('webhook', { limit: N(process.env.RL_WEBHOOK_LIMIT, 120), windowSec: N(process.env.RL_WEBHOOK_WINDOW, 60), keyFn: (req) => 'ip:' + ipOf(req) });
const apiGuard = guard('api', { limit: N(process.env.RL_API_LIMIT, 300), windowSec: N(process.env.RL_API_WINDOW, 60) });
const broadcastGuard = guard('broadcast', { limit: N(process.env.RL_BROADCAST_LIMIT, 30), windowSec: N(process.env.RL_BROADCAST_WINDOW, 60) });

module.exports = { guard, authGuard, webhookGuard, apiGuard, broadcastGuard, ipOf, tenantOrIp };
