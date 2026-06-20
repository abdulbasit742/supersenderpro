// lib/securityGateway/rateLimitPolicy.js — Default rate-limit policies per scope (warn/preview by default).
const { config } = require('./config');

function defaults() {
  const r = config.rateLimits;
  return {
    public_form: { maxRequests: r.publicFormLimit, windowSeconds: r.publicFormWindowSeconds, mode: 'block_preview' },
    public_api: { maxRequests: 60, windowSeconds: 600, mode: 'block_preview' },
    developer_api: { maxRequests: r.developerApiLimit, windowSeconds: r.developerApiWindowSeconds, mode: 'warn' },
    webhook: { maxRequests: 30, windowSeconds: 600, mode: 'block_preview' },
    admin_api: { maxRequests: 120, windowSeconds: 600, mode: 'warn' },
    auth_like: { maxRequests: 20, windowSeconds: 600, mode: 'warn' },
    report_generation: { maxRequests: 20, windowSeconds: 3600, mode: 'warn' },
    generic: { maxRequests: 100, windowSeconds: 600, mode: 'report_only' },
  };
}
function forScope(scope) { const d = defaults(); return d[scope] || d.generic; }

module.exports = { defaults, forScope };
