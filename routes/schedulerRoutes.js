'use strict';
/**
 * routes/schedulerRoutes.js - scheduler status. Mounted at /api/scheduler (bootstrap). Admin-guarded.
 */
const express = require('express');
const scheduler = require('../lib/scheduler');
const router = express.Router();
function adminGuard(req, res, next) {
  const configured = process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) return next();
  const provided = req.get('x-admin-secret') || req.query.secret;
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}
router.get('/', adminGuard, (req, res) => res.json({ success: true, scheduler: scheduler.status() }));
module.exports = router;
