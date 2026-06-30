'use strict';
/**
 * routes/observabilityRoutes.js - ops visibility. Mounted at /api/ops (see OBSERVABILITY HOOK).
 * Wire: node scripts/wire-observability.js
 * Read-only; admin-guarded when an admin secret is configured.
 */
const express = require('express');
const { errorTracker, logger } = require('../lib/observability');

const router = express.Router();
function adminGuard(req, res, next) {
  const configured = process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) return next();
  const provided = req.get('x-admin-secret') || req.query.secret;
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

router.get('/errors', adminGuard, (req, res) => res.json({ success: true, errors: errorTracker.recent(Number(req.query.limit || 25)), stats: errorTracker.stats() }));
router.get('/log-level', adminGuard, (req, res) => res.json({ success: true, level: logger.level || process.env.LOG_LEVEL || 'info' }));

module.exports = router;
