'use strict';
/**
 * routes/healthRoutes.js - Core Stability health endpoints.
 * Mounted in server.js at /api/health (see HEALTH CHECK HOOK).
 * Wire it with: node scripts/wire-health-check.js
 *
 * Status -> HTTP code mapping: ok=200, degraded=200 (with body), down=503.
 * Degraded returns 200 so load balancers keep the node in rotation while we alert.
 */
const express = require('express');
const H = require('../lib/healthCheck');

const router = express.Router();
const code = (status) => (status === 'down' ? 503 : 200);

router.get('/', async (req, res) => {
  try { const r = await H.getHealth({ force: req.query.force === 'true' }); res.status(code(r.status)).json(r); }
  catch (e) { res.status(503).json({ status: 'down', error: e.message }); }
});

router.get('/live', async (req, res) => {
  try { const r = await H.getLiveness(); res.status(code(r.status)).json(r); }
  catch (e) { res.status(503).json({ status: 'down', error: e.message }); }
});

router.get('/ready', async (req, res) => {
  try { const r = await H.getReadiness(); res.status(code(r.status)).json(r); }
  catch (e) { res.status(503).json({ status: 'down', error: e.message }); }
});

module.exports = router;
