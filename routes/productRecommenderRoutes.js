'use strict';
/**
 * Feature #128 - AI Product Recommender routes
 * Self-mountable Express router. Mount with:
 *   app.use('/api/recommender', require('./routes/productRecommenderRoutes'));
 * or via the AI Suite mounter (#52).
 */
const express = require('express');
const router = express.Router();
const rec = require('../lib/productRecommender/productRecommender');

function tenantOf(req) {
  return (
    req.headers['x-tenant-id'] ||
    (req.body && req.body.tenantId) ||
    (req.query && req.query.tenantId)
  );
}

router.get('/health', (_req, res) => {
  res.json({ ok: true, feature: 'product-recommender', n: 128 });
});

// GET recommendations for a contact
router.get('/recommend/:contactId', (req, res) => {
  try {
    const tenantId = tenantOf(req);
    const out = rec.recommend(tenantId, req.params.contactId, {
      limit: req.query.limit,
      interests: req.query.interests ? String(req.query.interests).split(',') : undefined
    });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// POST AI-phrased pitch
router.post('/pitch/:contactId', async (req, res) => {
  try {
    const tenantId = tenantOf(req);
    const out = await rec.pitch(tenantId, req.params.contactId, req.body || {});
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// POST set contact interests
router.post('/contact/:contactId/interests', (req, res) => {
  try {
    const tenantId = tenantOf(req);
    const out = rec.setContactInterests(tenantId, req.params.contactId, (req.body && req.body.tags) || []);
    res.json({ ok: true, contactId: req.params.contactId, ...out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// POST upload local catalog (fallback when catalog manager #76 not present)
router.post('/catalog', (req, res) => {
  try {
    const tenantId = tenantOf(req);
    const n = rec.saveLocalCatalog(tenantId, (req.body && req.body.products) || []);
    res.json({ ok: true, saved: n });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
