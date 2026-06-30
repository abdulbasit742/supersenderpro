'use strict';
/**
 * #94 Back-in-Stock Waitlist routes. Self-mountable Express router.
 * Mount once in server.js:  app.use(require('./routes/waitlistRoutes'));
 * Does NOT touch the server.js monolith otherwise.
 */
const express = require('express');
const router = express.Router();
const wl = require('../lib/waitlist/waitlistEngine');

function tenantOf(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || req.query.tenantId;
}

router.get('/api/waitlist/health', (_req, res) => res.json({ ok: true, feature: 'back-in-stock-waitlist', n: 94 }));

router.post('/api/waitlist/join', (req, res) => {
  try {
    const out = wl.join(tenantOf(req), req.body || {});
    res.json({ ok: true, ...out });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/api/waitlist/list', (req, res) => {
  try {
    res.json({ ok: true, entries: wl.list(tenantOf(req), req.query || {}) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/api/waitlist/stats', (req, res) => {
  try {
    res.json({ ok: true, ...wl.stats(tenantOf(req)) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/api/waitlist/remove', (req, res) => {
  try {
    res.json({ ok: true, ...wl.remove(tenantOf(req), req.body || {}) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// restock event -> notify everyone waiting (consent + throttle gated)
router.post('/api/waitlist/notify', async (req, res) => {
  try {
    const out = await wl.notifyRestock(tenantOf(req), req.body || {});
    res.json({ ok: true, ...out });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
