// lib/apiGateway/rateLimiter.js — Simple per-key fixed-window rate limiter backed by the JSON store.
// Window is one minute. Returns { allowed, remaining, limit, resetAt }. Good enough for a JSON-file
// app; swap for Redis when the project moves shared state there (per the roadmap).

const store = require('./store');

function check(keyId, limitPerMin, refNow = Date.now()) {
 const limit = Number(limitPerMin) > 0 ? Number(limitPerMin) : 120;
 const windowKey = Math.floor(refNow / 60000); // minute bucket
 const d = store.load();
 const cur = d.rate[keyId];
 let count;
 if (!cur || cur.window !== windowKey) { d.rate[keyId] = { window: windowKey, count: 1 }; count = 1; }
 else { cur.count += 1; count = cur.count; }
 store.save(d);
 const allowed = count <= limit;
 return { allowed, remaining: Math.max(0, limit - count), limit, resetAt: new Date((windowKey + 1) * 60000).toISOString() };
}

module.exports = { check };
