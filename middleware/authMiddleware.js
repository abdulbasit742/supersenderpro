'use strict';
/**
 * middleware/authMiddleware.js - Express guards for Phase 2 auth.
 * requireAuth attaches req.user + req.tenantId from a Bearer JWT (or session cookie).
 * requireRole(min) enforces RBAC using the role hierarchy owner>admin>agent>viewer.
 */
const auth = require('../lib/auth');

function extractToken(req) {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  if (req.query && req.query.token) return String(req.query.token);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

function requireAuth(req, res, next) {
  (async () => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ success: false, error: 'auth required' });
      const { user, claims } = await auth.getUserFromToken(token);
      req.user = user;
      req.tenantId = user.tenantId;
      req.authClaims = claims;
      next();
    } catch (e) { res.status(401).json({ success: false, error: 'invalid session: ' + e.message }); }
  })();
}

function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'auth required' });
    if (!auth.roleAtLeast(req.user.role, minRole)) return res.status(403).json({ success: false, error: 'requires role >= ' + minRole });
    next();
  };
}

module.exports = { requireAuth, requireRole, extractToken };
