'use strict';
/**
 * lib/audit/middleware.js - auditAction(action) records a successful mutation after the handler.
 * Hooks res.on('finish'): logs only on 2xx so failed attempts don't pollute the trail
 * (failed auth is better logged explicitly where you have the reason). Never throws.
 */
const audit = require('./index');

function auditAction(action, metaFn) {
  return (req, res, next) => {
    res.on('finish', () => {
      try {
        if (res.statusCode < 200 || res.statusCode >= 300) return;
        const tenantId = req.tenantId || req.get('x-tenant-id') || (req.body && req.body.tenantId) || req.query.tenantId;
        if (!tenantId) return;
        const meta = metaFn ? metaFn(req, res) : { path: req.originalUrl || req.url, method: req.method };
        audit.record(tenantId, action, req.user || null, meta).catch(() => {});
      } catch {}
    });
    next();
  };
}

module.exports = { auditAction };
