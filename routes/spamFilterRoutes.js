'use strict';
/**
 * Self-mountable router for the AI Inbound Spam & Abuse Filter.
 * Mount in server.js with:
 *   app.use('/api/spam-filter', require('./routes/spamFilterRoutes'));
 * No new deps. Tenant taken from header x-tenant-id or body.tenantId.
 */

const express = require('express');
const router = express.Router();
const spam = require('../lib/spamFilter/spamFilter');

function getTenant(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || req.query.tenantId;
}

// Pure classification, no persistence
router.post('/classify', async (req, res) => {
  try {
    const text = (req.body && req.body.text) || '';
    const useAi = !(req.body && req.body.useAi === false);
    const result = await spam.classify(text, { useAi });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Classify + persist counters for the tenant
router.post('/check', async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const text = (req.body && req.body.text) || '';
    const useAi = !(req.body && req.body.useAi === false);
    const result = await spam.check(tenantId, text, { useAi });
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Human feedback
router.post('/feedback', (req, res) => {
  try {
    const tenantId = getTenant(req);
    const out = spam.recordOutcome(tenantId, req.body || {});
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const tenantId = getTenant(req);
    res.json({ ok: true, stats: spam.stats(tenantId) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/config', (req, res) => {
  res.json({
    ok: true,
    config: {
      labels: ['clean', 'spam', 'scam', 'abuse'],
      actions: ['allow', 'quarantine', 'block'],
      aiTieBreak: 'borderline only (score 25-55), graceful fallback'
    }
  });
});

router.get('/health', (req, res) => {
  let ok = true;
  try { spam.classifyDeterministic('health check ping'); } catch (_) { ok = false; }
  res.json({ ok, feature: 'ai-inbound-spam-filter', deterministic: true });
});

module.exports = router;
