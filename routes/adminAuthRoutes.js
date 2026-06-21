'use strict';
/**
 * routes/adminAuthRoutes.js — admin auth API.
 * GET /api/admin-auth/status
 * POST /api/admin-auth/login { email, password }
 * POST /api/admin-auth/logout
 * GET /api/admin-auth/me
 * GET /api/admin-auth/guards
 * Requires express.json() for login. Never returns tokens/hashes; never leaks stack traces.
 */
const express = require('express');
const router = express.Router();
const { config, issues } = require('../lib/adminAuth/authConfig');
const sessionStore = require('../lib/adminAuth/sessionStore');
const passwordAuth = require('../lib/adminAuth/passwordAuth');
const mw = require('../lib/adminAuth/authMiddleware');
const redactor = require('../lib/adminAuth/redactor');

// Ensure req.adminAuth is populated even if app-level middleware isn't wired.
router.use(mw.attach());
function wrap(h) {
  return function (req, res) {
    try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error: 'internal_error' }); }
  };
}
router.get('/status', wrap(function (req, res) {
  const c = config();
  const i = issues();
  res.json({
    ok: true,
    module: 'admin-auth',
    enabled: c.enabled,
    requireLogin: c.requireLogin,
    demoMode: c.demoMode,
    authenticated: !!(req.adminAuth && req.adminAuth.authenticated),
    dryRun: true,
    warnings: i.warnings,
    blockers: i.blockers,
    timestamp: new Date().toISOString(),
  });
}));
router.post('/login', wrap(function (req, res) {
  const c = config();
  if (!c.enabled) return res.status(404).json({ ok: false, error: 'admin_auth_disabled' });
  const body = req.body || {};
  if (!c.adminPasswordHash) {
    return res.status(503).json({ ok: false, status: 'not_configured', message: 'No admin password hash configured. Set ADMIN_AUTH_ADMIN_PASSWORD_HASH.', timestamp: new Date().toISOString() });
  }
  const result = passwordAuth.verify(body.email, body.password);
  if (!result.ok) {
    return res.status(401).json({ ok: false, status: 'unauthorized', message: 'Invalid credentials.', timestamp: new Date().toISOString() });
  }
  const { token, sig } = sessionStore.create(result.email, result.role);
  mw.setSessionCookie(res, token, sig);
  res.json({ ok: true, status: 'authenticated', user: redactor.maskEmail(result.email), role: result.role, timestamp: new Date().toISOString() });
}));
router.post('/logout', wrap(function (req, res) {
  try {
    const cookies = mw.parseCookies(req);
    const raw = cookies[config().cookieName];
    if (raw && raw.indexOf('.') > -1) sessionStore.destroy(raw.split('.')[0]);
  } catch (e) { /* ignore */ }
  mw.clearSessionCookie(res);
  res.json({ ok: true, status: 'logged_out', timestamp: new Date().toISOString() });
}));
router.get('/me', wrap(function (req, res) {
  const authed = !!(req.adminAuth && req.adminAuth.authenticated);
  res.json({ ok: true, authenticated: authed, session: authed ? redactor.safeSession(req.adminAuth.session) : null, timestamp: new Date().toISOString() });
}));
router.get('/guards', wrap(function (req, res) {
  res.json({
    ok: true,
    helper: 'requireAdminAuth(options)',
    options: { module: 'string', permission: 'string (optional, hands off to RBAC)', allowDemo: 'boolean', requireLogin: 'boolean' },
    examples: [
      { route: 'GET /api/admin-auth/secure-test', guard: "requireAdminAuth({ module: 'admin-auth', requireLogin: true })" },
      { route: 'POST /api/backup/restore', guard: "requireAdminAuth({ permission: 'backup.restore' })", note: 'hands off to existing RBAC requirePermission when authenticated' },
    ],
    dryRun: true,
    timestamp: new Date().toISOString(),
  });
}));
const { requireAdminAuth } = require('../lib/adminAuth/routeGuard');
router.get('/secure-test', requireAdminAuth({ module: 'admin-auth', requireLogin: true }), wrap(function (req, res) {
  res.json({ ok: true, status: 'admin_area', message: 'You are authenticated as admin.', timestamp: new Date().toISOString() });
}));
module.exports = router;
