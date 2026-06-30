'use strict';
/**
 * routes/embeddedSignupRoutes.js - WhatsApp Embedded Signup API.
 * Mounted in server.js at /api/embedded-signup (see EMBEDDED SIGNUP HOOK).
 * Wire it with: node scripts/wire-embedded-signup.js
 *
 * Security:
 * - /config returns ONLY public launcher values (appId, configId, version). No secrets.
 * - Connection access tokens are NEVER returned (redactConnection strips them).
 * - /callback completes onboarding from the launcher `code`. Simulation-safe until live.
 * - Write endpoints admin-guarded (x-admin-secret / ?secret / body.secret).
 */
const express = require('express');
const ES = require('../lib/embeddedSignup');

const router = express.Router();

function adminGuard(req, res, next) {
  if (!ES.config.requireAdmin) return next();
  const configured = process.env.EMBEDDED_SIGNUP_ADMIN_SECRET || process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[EmbeddedSignup] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized', fix: 'Send x-admin-secret matching EMBEDDED_SIGNUP_ADMIN_SECRET' });
}

const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.params.tenantId || (req.body && req.body.tenantId) || req.query.tenantId || 'default';

/* ---------------- Public launcher config + docs ---------------- */
router.get('/config', (req, res) => { try { ok(res, { config: ES.publicConfig() }); } catch (e) { fail(res, e); } });
router.get('/snippet', (req, res) => { try { res.set('Content-Type', 'text/plain'); res.send(ES.launcher.clientSnippet()); } catch (e) { fail(res, e); } });
router.get('/status', (req, res) => { try { ok(res, { live: ES.isLive(), connections: ES.connections.list(tid(req)).length }); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => { try { ok(res, { doctor: ES.doctor.run() }); } catch (e) { fail(res, e); } });

/* ---------------- Onboarding callback (from the launcher `code`) ---------------- */
router.post('/callback', adminGuard, (req, res) => {
  (async () => {
    try { ok(res, { result: await ES.completeSignup(tid(req), req.body || {}) }); }
    catch (e) { fail(res, e, 400); }
  })();
});

/* ---------------- Connections (tokens always redacted) ---------------- */
router.get('/connections', (req, res) => { try { ok(res, { connections: ES.connections.list(tid(req)).map(ES.redactConnection) }); } catch (e) { fail(res, e); } });
router.get('/connections/:connId', (req, res) => { try { const c = ES.connections.get(tid(req), req.params.connId); return c ? ok(res, { connection: ES.redactConnection(c) }) : fail(res, new Error('connection not found'), 404); } catch (e) { fail(res, e); } });
router.delete('/connections/:connId', adminGuard, (req, res) => { try { ok(res, { removed: ES.connections.remove(tid(req), req.params.connId) }); } catch (e) { fail(res, e); } });

module.exports = router;
