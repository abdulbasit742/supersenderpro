'use strict';
// Self-mountable router for the AI Churn Predictor. Mounted by
// lib/bootstrap/registerSubsystems.js — server.js is never edited.
// Tenant via x-tenant-id header. Writes guarded by x-admin-secret/ADMIN_TOKEN.
const express = require('express');
const router = express.Router();
const churn = require('../lib/churnPredictor');
const doctor = require('../lib/churnPredictor/doctor');

function tenant(req) {
  const t = req.headers['x-tenant-id'];
  if (!t) { const e = new Error('x-tenant-id header required'); e.status = 400; throw e; }
  return t;
}

function requireAdmin(req) {
  const secret = process.env.ADMIN_TOKEN || process.env.ADMIN_SECRET;
  if (!secret) return; // open in dev if unset
  if (req.headers['x-admin-secret'] !== secret) {
    const e = new Error('admin secret required'); e.status = 403; throw e;
  }
}

router.get('/health', async (_req, res) => {
  res.json(await doctor.check());
});

// Ingest/refresh contact RFM features (admin).
router.post('/contacts', express.json({ limit: '1mb' }), (req, res) => {
  try {
    requireAdmin(req);
    const t = tenant(req);
    const arr = Array.isArray(req.body) ? req.body : (req.body && req.body.contacts) || [];
    const count = churn.upsertContacts(t, arr);
    res.json({ ok: true, contacts: count });
  } catch (e) { res.status(e.status || 500).json({ ok: false, error: e.message }); }
});

// Predict at-risk customers. enrich=false to skip the model. persist=true to save flags.
router.get('/predict', async (req, res) => {
  try {
    const t = tenant(req);
    const enrich = req.query.enrich !== 'false';
    const persist = req.query.persist === 'true';
    const out = await churn.predict(t, { enrich, persist });
    res.json({ ok: true, ...out });
  } catch (e) { res.status(e.status || 500).json({ ok: false, error: e.message }); }
});

module.exports = router;
module.exports.basePath = '/api/churn';
