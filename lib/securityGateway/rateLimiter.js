// lib/securityGateway/rateLimiter.js — Rate limit engine. Report-only / preview by default.
// Never blocks live unless SECURITY_GATEWAY_ENFORCE=true. Stores only hashed identifiers.
const { config } = require('./config');
const { buildKey } = require('./rateLimitKeys');
const rlStore = require('./rateLimitStore');
const rlPolicy = require('./rateLimitPolicy');

function check(ctx = {}) {
  const scope = ctx.scope || 'generic';
  const pol = rlPolicy.forScope(scope);
  const maxRequests = Number.isFinite(Number(ctx.maxRequests)) ? Number(ctx.maxRequests) : pol.maxRequests;
  const windowSeconds = Number.isFinite(Number(ctx.windowSeconds)) ? Number(ctx.windowSeconds) : pol.windowSeconds;
  const key = ctx.key || buildKey(ctx);
  const { count, resetInSeconds } = rlStore.hit(key, windowSeconds);
  const over = count > maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  const enforce = config.enforce === true && (pol.mode === 'block_preview' || pol.mode === 'block_live_if_enabled');
  return {
    scope,
    keyHashed: key, // already composed of hashes only
    limit: maxRequests,
    windowSeconds,
    count,
    remaining,
    over,
    warning: over,
    retryAfterSeconds: over ? resetInSeconds : 0,
    blockMode: pol.mode,
    // Live blocking only when enforcement explicitly enabled AND policy is a blocking mode.
    blockedLive: over && enforce,
    dryRun: !enforce,
  };
}

function resetPreview(ctx = {}) {
  const key = ctx.key || buildKey(ctx);
  // Preview only: report what would be reset; only actually reset counters in non-dry-run.
  const willReset = true;
  if (config.enforce) rlStore.reset(key);
  return { keyHashed: key, willReset, applied: config.enforce === true, dryRun: config.enforce !== true };
}

module.exports = { check, resetPreview };
