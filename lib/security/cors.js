'use strict';
/**
 * lib/security/cors.js - allowlist-based CORS without the `cors` package.
 * Origins come from CORS_ALLOWED_ORIGINS (comma-separated). '*' (default in dev) allows any
 * origin but, when credentials are enabled, reflects the request origin instead of literal '*'
 * (browsers reject credentials + wildcard). Handles OPTIONS preflight.
 */
const RAW = process.env.CORS_ALLOWED_ORIGINS || '*';
const ALLOW_ALL = RAW.trim() === '*';
const ALLOWED = ALLOW_ALL ? [] : RAW.split(',').map((s) => s.trim()).filter(Boolean);
const CREDENTIALS = String(process.env.CORS_CREDENTIALS || 'true') === 'true';
const METHODS = process.env.CORS_METHODS || 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const HEADERS = process.env.CORS_HEADERS || 'Content-Type,Authorization,x-api-key,x-tenant-id,Idempotency-Key,x-admin-secret';
const MAX_AGE = process.env.CORS_MAX_AGE || '600';

function isAllowed(origin) {
  if (!origin) return true; // non-browser / same-origin
  if (ALLOW_ALL) return true;
  return ALLOWED.includes(origin);
}

function cors() {
  return (req, res, next) => {
    const origin = req.get('origin');
    if (origin && isAllowed(origin)) {
      // reflect specific origin when credentials are on (wildcard is invalid with credentials)
      res.set('Access-Control-Allow-Origin', (ALLOW_ALL && !CREDENTIALS) ? '*' : origin);
      res.set('Vary', 'Origin');
      if (CREDENTIALS) res.set('Access-Control-Allow-Credentials', 'true');
    } else if (!origin && ALLOW_ALL && !CREDENTIALS) {
      res.set('Access-Control-Allow-Origin', '*');
    }
    res.set('Access-Control-Allow-Methods', METHODS);
    res.set('Access-Control-Allow-Headers', HEADERS);
    res.set('Access-Control-Max-Age', MAX_AGE);
    if (req.method === 'OPTIONS') {
      // block disallowed origins at preflight
      if (origin && !isAllowed(origin)) return res.status(403).end();
      return res.status(204).end();
    }
    if (origin && !isAllowed(origin)) {
      // let the request proceed but without CORS headers -> browser blocks it; APIs/cURL still work
    }
    next();
  };
}

module.exports = { cors, isAllowed, ALLOWED, ALLOW_ALL };
