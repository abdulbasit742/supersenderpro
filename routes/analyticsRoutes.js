'use strict';
/**
 * routes/analyticsRoutes.js - business KPI summary. Mounted at /api/analytics (bootstrap).
 * Auth required; tenant-scoped. ?from=ISO&to=ISO to bound revenue by date.
 */
const express = require('express');
const analytics = require('../lib/analytics');
let requireAuth = (req, res, next) => next();
try { requireAuth = require('../middleware/authMiddleware').requireAuth; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';

router.get('/summary', requireAuth, async (req, res) => {
  try { res.json({ success: true, analytics: await analytics.summary(tid(req), { from: req.query.from, to: req.query.to }) }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
