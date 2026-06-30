'use strict';
/**
 * Self-mountable router for the Business Hours / Away-Message Auto-Responder.
 * Mount with: app.use(require('./routes/businessHoursAutoRoutes'));
 * Does NOT touch server.js.
 */
const express = require('express');
const router = express.Router();
const bha = require('../lib/businessHoursAuto/businessHoursAuto');

function tenantOf(req) {
  return req.headers['x-tenant-id'] || req.query.tenantId || (req.body && req.body.tenantId);
}

router.get('/api/business-hours-auto/config', function (req, res) {
  try {
    res.json({ ok: true, config: bha.loadConfig(tenantOf(req)) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/api/business-hours-auto/config', function (req, res) {
  try {
    res.json({ ok: true, config: bha.saveConfig(tenantOf(req), req.body || {}) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/api/business-hours-auto/status', function (req, res) {
  try {
    const cfg = bha.loadConfig(tenantOf(req));
    res.json({ ok: true, status: bha.isOpen(cfg, req.query.when) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/api/business-hours-auto/incoming', async function (req, res) {
  try {
    const body = req.body || {};
    const out = await bha.handleIncoming({ tenantId: tenantOf(req), contact: body.contact, when: body.when });
    res.json(Object.assign({ ok: true }, out));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
