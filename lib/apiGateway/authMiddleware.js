// lib/apiGateway/authMiddleware.js — Express middleware factory enforcing API key auth + scopes +
// per-key rate limits. Reads the key from 'Authorization: Bearer <key>' or 'x-api-key'. On success
// attaches req.apiKey (public view) + req.apiKeyRaw. 401 on bad key, 403 on missing scope, 429 on
// rate-limit. Never logs the presented secret.

const keyStore = require('./keyStore');
const rateLimiter = require('./rateLimiter');
const { config } = require('./config');

function _presented(req) {
 const auth = req.headers['authorization'] || '';
 if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
 if (req.headers['x-api-key']) return String(req.headers['x-api-key']).trim();
 return null;
}

// requireScope: a scope string the route needs (or null to just require a valid key).
function requireApiKey(requiredScope = null) {
 return function (req, res, next) {
 if (!config.enabled) return res.status(503).json({ ok: false, error: 'api gateway disabled' });
 const secret = _presented(req);
 const keyRec = keyStore.verifySecret(secret);
 if (!keyRec) return res.status(401).json({ ok: false, error: 'invalid or missing API key' });
 if (requiredScope && !keyStore.hasScope(keyRec, requiredScope)) {
 return res.status(403).json({ ok: false, error: 'missing scope: ' + requiredScope });
 }
 const rl = rateLimiter.check(keyRec.id, keyRec.rateLimitPerMin);
 res.setHeader('X-RateLimit-Limit', rl.limit);
 res.setHeader('X-RateLimit-Remaining', rl.remaining);
 res.setHeader('X-RateLimit-Reset', rl.resetAt);
 if (!rl.allowed) return res.status(429).json({ ok: false, error: 'rate limit exceeded', resetAt: rl.resetAt });
 req.apiKey = keyStore.publicView(keyRec);
 req.apiKeyRaw = keyRec;
 next();
 };
}

module.exports = { requireApiKey };
