'use strict';
/**
 * Self-mountable Express router for the AI FAQ Deflection engine.
 *
 * Mount (in server.js or via aiSuite.mountAll):
 *   app.use('/api/faq-deflection', require('./routes/faqDeflectionRoutes'));
 *
 * Tenant resolution: x-tenant-id header, ?tenantId=, or body.tenantId.
 */

const express = require('express');
const engine = require('../lib/faqDeflection/faqDeflection');

const router = express.Router();

function tenantOf(req) {
  return (
    req.headers['x-tenant-id'] ||
    (req.query && req.query.tenantId) ||
    (req.body && req.body.tenantId) ||
    'default'
  );
}

// health
router.get('/health', (req, res) => {
  res.json(engine.health());
});

// list faqs
router.get('/faqs', (req, res) => {
  res.json({ faqs: engine.listFaqs(tenantOf(req)) });
});

// upsert one faq
router.post('/faqs', (req, res) => {
  try {
    const entry = engine.upsertFaq(tenantOf(req), req.body || {});
    res.json({ ok: true, faq: entry });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// bulk seed
router.post('/faqs/bulk', (req, res) => {
  const faqs = (req.body && req.body.faqs) || [];
  const out = engine.seedFaqs(tenantOf(req), faqs);
  res.json({ ok: true, added: out.length, faqs: out });
});

// delete a faq
router.delete('/faqs/:id', (req, res) => {
  const ok = engine.removeFaq(tenantOf(req), req.params.id);
  res.status(ok ? 200 : 404).json({ ok });
});

// dry-run match (no stats, no side effects)
router.post('/match', (req, res) => {
  const message = (req.body && req.body.message) || '';
  res.json(engine.match(tenantOf(req), message));
});

// main deflect endpoint
router.post('/deflect', async (req, res) => {
  try {
    const message = (req.body && req.body.message) || '';
    if (!message) return res.status(400).json({ ok: false, error: 'message required' });
    const result = await engine.deflect(tenantOf(req), message, (req.body && req.body.options) || {});
    res.json(Object.assign({ ok: true }, result));
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// stats / deflection rate
router.get('/stats', (req, res) => {
  res.json(engine.getStats(tenantOf(req)));
});

module.exports = router;
