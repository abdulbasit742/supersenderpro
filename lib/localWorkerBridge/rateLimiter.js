  'use strict';

  /**
      * Local Worker Bridge — per-worker token-bucket rate limiter (in-memory).
      *
      * Limits how fast a single worker can claim/send jobs, protecting the WhatsApp
      * number from burst patterns that trigger bans. Pure in-memory; resets on
      * restart (acceptable — it's a safety throttle, not an accounting ledger).
      */

  const { config } = require('./config');


  // workerId -> { tokens, lastRefill }
  const buckets = new Map();

  function now() { return Date.now(); }


  function getLimits() {
    // refillRate = tokens added per second; capacity = max burst.
       const perMinute = config.rateLimitPerMinute || 20;
       return {
           capacity: config.rateLimitBurst || Math.max(5, Math.ceil(perMinute / 2)),
           refillPerSec: perMinute / 60,
       };
  }


  function refill(bucket, limits) {
       const t = now();
       const elapsedSec = (t - bucket.lastRefill) / 1000;
       if (elapsedSec <= 0) return;
       bucket.tokens = Math.min(limits.capacity, bucket.tokens + elapsedSec * limits.refillPerSec);
       bucket.lastRefill = t;
  }

  /**
      * Try to consume 1 token for a worker.
      * Returns { allowed, retryAfterSec, remaining }.
   */
  function take(workerId) {
       const limits = getLimits();
       let bucket = buckets.get(workerId);
       if (!bucket) {
         bucket = { tokens: limits.capacity, lastRefill: now() };
           buckets.set(workerId, bucket);
       }
       refill(bucket, limits);
       if (bucket.tokens >= 1) {


       bucket.tokens -= 1;
       return { allowed: true, retryAfterSec: 0, remaining: Math.floor(bucket.tokens) };
   }
   const needed = 1 - bucket.tokens;
   const retryAfterSec = Math.ceil(needed / limits.refillPerSec);
   return { allowed: false, retryAfterSec, remaining: 0 };
}

/** Inspect without consuming (for status/debug). */
function peek(workerId) {
 const limits = getLimits();
   const bucket = buckets.get(workerId);
   if (!bucket) return { remaining: limits.capacity, capacity: limits.capacity };
   refill(bucket, limits);
   return { remaining: Math.floor(bucket.tokens), capacity: limits.capacity };
}

function reset(workerId) {
 if (workerId) buckets.delete(workerId);
   else buckets.clear();
}

module.exports = { take, peek, reset };
