'use strict';
// #86 Multi-Language & Localization — HTTP routes. Mount: app.use('/api/localization', require('./routes/localizationRoutes'));
const express = require('express');
const router = express.Router();
const loc = require('../lib/localization');

function tenantOf(req) { return (req.headers['x-tenant-id'] || (req.user && req.user.tenantId) || req.query.tenantId || 'default'); }

router.get('/health', (req, res) => res.json(loc.doctor.check()));

// Detect language of a text
router.post('/detect', (req, res) => {
  const { text } = req.body || {};
  res.json({ ok: true, detection: loc.detector.detect(text) });
});

// Get/set a contact's locale
router.get('/locale/:contactId', (req, res) => {
  res.json({ ok: true, locale: loc.localeOf(tenantOf(req), req.params.contactId) });
});
router.post('/locale/:contactId', (req, res) => {
  const { locale } = req.body || {};
  res.json({ ok: true, locale: loc.setLocale(tenantOf(req), req.params.contactId, locale) });
});

// Observe inbound (detect + persist)
router.post('/observe', (req, res) => {
  const { contactId, text } = req.body || {};
  res.json({ ok: true, detection: loc.observe({ tenantId: tenantOf(req), contactId, text }) });
});

// Translate / localize
router.post('/translate', async (req, res) => {
  try {
    const { contactId, text, targetLocale, sourceLocale } = req.body || {};
    const out = await loc.localize({ tenantId: tenantOf(req), contactId, text, targetLocale, sourceLocale });
    res.json(Object.assign({ ok: true }, out));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Seed a manual translation into memory
router.post('/memory', (req, res) => {
  const { targetLocale, text, translation } = req.body || {};
  loc.remember({ targetLocale, text, translation });
  res.json({ ok: true });
});

module.exports = router;
