// routes/kpiDigestRoutes.js
// Self-mountable router for Feature #116 - Scheduled KPI Digest & CSV Exporter.
// Mount: require('./routes/kpiDigestRoutes').mount(app)  OR app.use(router).
// server.js is NOT modified.

'use strict';

const express = require('express');
const digest = require('../lib/kpiDigest/kpiDigest');

const router = express.Router();

function tenantFrom(req) {
  return (req.headers['x-tenant-id'] || req.query.tenantId || (req.body && req.body.tenantId) || '').toString();
}

// Build (and persist) a digest on demand.
router.post('/api/ai/kpi-digest/run', async (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const d = await digest.buildDigest(tenantId, req.body || {});
    const files = digest.persistDigest(tenantId, d);
    res.json({ ok: true, digest: d, files });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Get KPIs without persisting.
router.get('/api/ai/kpi-digest/preview', async (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const d = await digest.buildDigest(tenantId, { windowHours: Number(req.query.windowHours) || 24 });
    res.json({ ok: true, digest: d });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// CSV export (downloadable).
router.get('/api/ai/kpi-digest/export.csv', async (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const d = await digest.buildDigest(tenantId, { windowHours: Number(req.query.windowHours) || 24 });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="kpi-digest.csv"');
    res.send(d.csv);
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Schedule / unschedule recurring digests.
router.post('/api/ai/kpi-digest/schedule', (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const r = digest.scheduleDigest(tenantId, req.body || {});
    res.json({ ok: true, scheduled: r });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.delete('/api/ai/kpi-digest/schedule', (req, res) => {
  try {
    const tenantId = tenantFrom(req);
    const stopped = digest.stopSchedule(tenantId);
    res.json({ ok: true, stopped });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

function mount(app) {
  app.use(router);
  return router;
}

module.exports = router;
module.exports.router = router;
module.exports.mount = mount;
