'use strict';

const express = require('express');
const campaign = require('../lib/broadcastCampaign');

// Self-mountable router. server.js is NEVER edited directly; this is mounted by
// lib/bootstrap/registerSubsystems.js or scripts/wire-broadcast-campaign.js.
function createRouter() {
  const router = express.Router();

  // Admin guard for write routes (matches repo convention).
  function requireAdmin(req, res, next) {
    const secret = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET;
    if (!secret) return next(); // open in dev if no secret set
    const got = req.get('x-admin-secret') || req.get('x-admin-token');
    if (got && got === secret) return next();
    return res.status(401).json({ ok: false, error: 'admin auth required' });
  }

  function tenantOf(req) {
    return req.get('x-tenant-id') || (req.body && req.body.tenantId) || req.query.tenantId;
  }

  router.get('/health', (req, res) => {
    const doctor = require('../lib/broadcastCampaign/doctor');
    res.json(doctor.check());
  });

  router.get('/campaigns', (req, res) => {
    try {
      const tenantId = tenantOf(req);
      res.json({ ok: true, campaigns: campaign.listCampaigns(tenantId) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get('/campaigns/:id', (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const c = campaign.getCampaign(tenantId, req.params.id);
      if (!c) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, campaign: c });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Compose + create a draft (resolves audience, generates variants).
  router.post('/campaigns', requireAdmin, async (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const result = await campaign.createCampaign(tenantId, req.body || {});
      res.json({ ok: true, ...result });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Build a (dry-run by default) send plan for a campaign.
  router.post('/campaigns/:id/plan', requireAdmin, (req, res) => {
    try {
      const tenantId = tenantOf(req);
      const result = campaign.planSend(tenantId, req.params.id, req.body || {});
      res.json({ ok: true, ...result });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Preview copy variants without persisting anything.
  router.post('/preview', async (req, res) => {
    try {
      const body = req.body || {};
      const variants = await campaign.composer.compose(body.brief || {}, {
        variants: body.variants, context: body.context,
      });
      res.json({ ok: true, variants });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  return router;
}

module.exports = { createRouter, mountPath: '/api/broadcast-campaign' };
