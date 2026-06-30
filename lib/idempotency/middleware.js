'use strict';
/**
 * lib/idempotency/middleware.js - idempotent() middleware for mutating routes.
 * Looks for an `Idempotency-Key` header. If absent, passes through (opt-in per client).
 * If present:
 *   - replay a previously stored 2xx response for the same tenant+key
 *   - 409 on a concurrent in-flight duplicate
 *   - otherwise capture the response and store it on finish (2xx only)
 */
const store = require('./index');

function idempotent() {
  return (req, res, next) => {
    (async () => {
      const key = req.get('idempotency-key') || req.get('x-idempotency-key');
      if (!key || (req.method !== 'POST' && req.method !== 'PUT')) return next();
      const tenantId = req.tenantId || req.get('x-tenant-id') || (req.body && req.body.tenantId) || 'default';
      try {
        const r = await store.begin(tenantId, key);
        if (r.state === 'done') { res.set('Idempotent-Replay', 'true'); return res.status(r.response.status || 200).json(r.response.body); }
        if (r.state === 'pending') return res.status(409).json({ success: false, error: 'duplicate request in progress', idempotencyKey: key });
        // new: capture the json response to store it
        const origJson = res.json.bind(res);
        res.json = (body) => { if (res.statusCode >= 200 && res.statusCode < 300) { store.complete(tenantId, key, { status: res.statusCode, body }).catch(() => {}); } else { store.release(tenantId, key).catch(() => {}); } return origJson(body); };
        next();
      } catch { next(); }
    })();
  };
}

module.exports = { idempotent };
