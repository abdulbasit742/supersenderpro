'use strict';
/**
 * routes/maintenanceRoutes.js - view/toggle maintenance mode. Mounted at /api/maintenance (bootstrap).
 * GET is open (clients can detect maintenance); POST is admin-guarded.
 */
const express = require('express');
const maintenance = require('../lib/maintenance');

const router = express.Router();
function adminGuard(req, res, next) {
  const configured = process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || process.env.PLATFORM_ADMIN_SECRET || '';
  if (!configured) { console.warn('[Maintenance] no admin secret set - toggle allowed in dev'); return next(); }
  const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

router.get('/', (req, res) => res.json({ success: true, maintenance: maintenance.status() }));
router.post('/', adminGuard, async (req, res) => {
  try { const { mode, message, retryAfterSec } = req.body || {}; res.json({ success: true, maintenance: await maintenance.set(mode, { message, retryAfterSec }) }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;
