// routes/broadcastRoutes.js — REST surface for broadcast campaigns
// Mount in server.js:  app.use('/api/broadcast', require('./routes/broadcastRoutes'));
'use strict';

const express = require('express');
const router = express.Router();
const broadcast = require('../lib/broadcast');
const { maskRecipients } = require('../lib/broadcast/privacy');

// Resolve tenant from auth middleware if present, else header/body fallback.
function tenantOf(req) {
  return (req.user && req.user.tenantId) || req.headers['x-tenant-id'] || (req.body && req.body.tenantId);
}

function view(c) {
  if (!c) return c;
  return { ...c, targets: maskRecipients(c.targets) };
}

// List campaigns
router.get('/', (req, res) => {
  try { res.json({ ok: true, campaigns: broadcast.list(tenantOf(req)).map(view) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Get one
router.get('/:id', (req, res) => {
  try {
    const c = broadcast.get(tenantOf(req), req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, campaign: view(c) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Create (draft) campaign
router.post('/', (req, res) => {
  try {
    const { name, message, segmentId, recipients } = req.body || {};
    const c = broadcast.createCampaign(tenantOf(req), { name, message, segmentId, recipients });
    res.status(201).json({ ok: true, campaign: view(c) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Dispatch (draft-safe unless BROADCAST_LIVE=true)
router.post('/:id/dispatch', (req, res) => {
  try {
    const c = broadcast.dispatch(tenantOf(req), req.params.id);
    res.json({ ok: true, campaign: view(c) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Stats only
router.get('/:id/stats', (req, res) => {
  try {
    const c = broadcast.get(tenantOf(req), req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, stats: c.stats, state: c.state });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
