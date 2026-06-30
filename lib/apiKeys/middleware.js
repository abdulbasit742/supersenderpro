'use strict';
/**
 * lib/apiKeys/middleware.js - apiKeyAuth() authenticates via x-api-key header.
 * On success sets req.tenantId + req.apiKey (id, scopes). Optionally enforces a required scope.
 * Coexists with JWT auth: use whichever a given route accepts. Does not throw.
 */
const apiKeys = require('./index');

function apiKeyAuth({ requireScope } = {}) {
  return (req, res, next) => {
    (async () => {
      const raw = req.get('x-api-key') || (req.query && req.query.api_key);
      if (!raw) return res.status(401).json({ success: false, error: 'API key required (x-api-key)' });
      try {
        const v = await apiKeys.verify(raw);
        if (!v) return res.status(401).json({ success: false, error: 'invalid or revoked API key' });
        if (requireScope && !(v.scopes || []).includes(requireScope) && !(v.scopes || []).includes('*')) {
          return res.status(403).json({ success: false, error: 'API key missing scope: ' + requireScope });
        }
        req.tenantId = v.tenantId;
        req.apiKey = { id: v.keyId, scopes: v.scopes, name: v.name };
        next();
      } catch (e) { res.status(401).json({ success: false, error: 'api key auth failed' }); }
    })();
  };
}

module.exports = { apiKeyAuth };
