'use strict';
/**
 * routes/adminAlertRoutes.js - Core Stability admin-alert API.
 * Mounted at /api/admin-alerts (see ADMIN ALERTS HOOK). Wire: node scripts/wire-admin-alerts.js
 * Writes (test/evaluate) are admin-guarded.
 */
const express = require('express');
const A = require('../lib/adminAlert');
let H = null; try { H = require('../lib/healthCheck'); } catch {}

const router = express.Router();

function adminGuard(req, res, next) {
  const configured = process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) { console.warn('[AdminAlert] no admin secret set - write allowed in dev mode'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 500) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });

router.get('/status', (req, res) => { try { ok(res, { status: A.getStatus() }); } catch (e) { fail(res, e); } });
router.get('/history', (req, res) => { try { ok(res, { history: A.getHistory(Number(req.query.limit || 50)) }); } catch (e) { fail(res, e); } });

// Force an evaluation against the live health report right now.
router.post('/evaluate', adminGuard, async (req, res) => {
  try {
    if (!H) return fail(res, new Error('healthCheck unavailable'), 503);
    const report = await H.getHealth({ force: true });
    ok(res, { result: await A.evaluate(report), report });
  } catch (e) { fail(res, e); }
});

// Send a synthetic 'down' alert to verify the dispatch path end-to-end.
router.post('/test', adminGuard, async (req, res) => {
  try {
    const fake = { status: 'down', host: 'test', uptimeSec: 0, timestamp: new Date().toISOString(), checks: { test: { status: 'down', error: 'synthetic test alert' } } };
    ok(res, { result: await A.evaluate(fake) });
  } catch (e) { fail(res, e); }
});

module.exports = router;
