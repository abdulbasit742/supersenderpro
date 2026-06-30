'use strict';

/**
 * Self-mountable router for the Reorder / Replenishment Predictor.
 * Mount via lib/bootstrap/registerSubsystems.js or app.use('/api/reorder', router).
 *
 * Write endpoints are admin-guarded (x-admin-secret / ADMIN_TOKEN), matching
 * the repo convention. Read endpoints return masked phones only.
 */

const express = require('express');
const reorder = require('../lib/reorderPredictor');

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET || '';
  if (!expected) return next(); // dev mode: no token configured
  const got = req.get('x-admin-secret') || req.get('x-admin-token') || '';
  if (got && got === expected) return next();
  return res.status(401).json({ ok: false, error: 'admin auth required' });
}

function tenantOf(req) {
  return (
    req.get('x-tenant-id') ||
    (req.body && req.body.tenantId) ||
    req.query.tenantId ||
    ''
  );
}

function createRouter() {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({ ok: true, subsystem: 'reorderPredictor' });
  });

  // record a purchase (admin)
  router.post('/purchase', requireAdmin, express.json(), (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const out = reorder.recordPurchase(tenantId, req.body || {});
      res.json({ ok: true, ...out });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // run prediction
  router.get('/predict', (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const horizonDays = req.query.horizonDays ? Number(req.query.horizonDays) : undefined;
      const out = reorder.predict(tenantId, { horizonDays });
      res.json({ ok: true, ...out });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // build dry-run nudges (admin)
  router.get('/nudges', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const horizonDays = req.query.horizonDays ? Number(req.query.horizonDays) : undefined;
      const out = await reorder.buildNudges(tenantId, { horizonDays });
      res.json({ ok: true, ...out });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  return router;
}

module.exports = createRouter;
module.exports.createRouter = createRouter;
