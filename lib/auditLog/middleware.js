// lib/auditLog/middleware.js — Express middleware that auto-logs mutating API calls. Captures
// actor (from req.apiKey/req.user/session when present), method+path as the action, the route
// target, a redacted snapshot of params/query/body, client ip, and the response status. Reads
// (GET/HEAD) are skipped unless logReadsToo is enabled.

const logger = require('./logger');
const { config } = require('./config');

function _actor(req) {
 if (req.apiKey && req.apiKey.id) return 'apikey:' + req.apiKey.id;
 if (req.user && (req.user.id || req.user.email)) return 'user:' + (req.user.id || req.user.email);
 if (req.session && req.session.userId) return 'user:' + req.session.userId;
 return 'anonymous';
}
function _ip(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || (req.connection && req.connection.remoteAddress) || null; }

function auditMiddleware(opts = {}) {
 const label = opts.label || null;
 return function (req, res, next) {
 if (!config.enabled) return next();
 const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
 if (!isMutating && !config.logReadsToo) return next();
 res.on('finish', () => {
 try {
 logger.record({
 actor: _actor(req),
 action: label || `${req.method} ${req.baseUrl || ''}${req.path || ''}`,
 target: (req.params && Object.keys(req.params).length) ? JSON.stringify(req.params) : null,
 metadata: { query: req.query || {}, body: req.body || {}, params: req.params || {} },
 ip: _ip(req),
 status: res.statusCode >= 400 ? ('error:' + res.statusCode) : ('ok:' + res.statusCode),
 });
 } catch (_e) { /* never break the request because of audit logging */ }
 });
 next();
 };
}

module.exports = { auditMiddleware };
