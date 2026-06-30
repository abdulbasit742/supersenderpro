// routes/quickReplyRoutes.js
// Self-mountable router for the Quick-Reply / Canned Response Manager (#118).
// Mount: const { mount } = require('./routes/quickReplyRoutes'); mount(app);
// Does NOT touch server.js. Tenant from req.tenantId or x-tenant-id header.

'use strict';

const express = require('express');
const qr = require('../lib/quickReply/quickReply');

function tenantOf(req) {
  return req.tenantId || req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || (req.query && req.query.tenantId);
}

function buildRouter() {
  const router = express.Router();

  router.get('/quick-replies', function (req, res) {
    try { res.json({ ok: true, items: qr.list(tenantOf(req)) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post('/quick-replies', function (req, res) {
    try { res.json({ ok: true, item: qr.create(tenantOf(req), req.body || {}) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get('/quick-replies/analytics', function (req, res) {
    try { res.json({ ok: true, analytics: qr.analytics(tenantOf(req)) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get('/quick-replies/:id', function (req, res) {
    try {
      const item = qr.get(tenantOf(req), req.params.id);
      if (!item) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, item: item });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.put('/quick-replies/:id', function (req, res) {
    try { res.json({ ok: true, item: qr.update(tenantOf(req), req.params.id, req.body || {}) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.delete('/quick-replies/:id', function (req, res) {
    try { res.json({ ok: true, result: qr.remove(tenantOf(req), req.params.id) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Resolve a shortcut like /thanks into a rendered reply
  router.post('/quick-replies/resolve', function (req, res) {
    try {
      const body = req.body || {};
      const item = qr.byShortcut(tenantOf(req), body.shortcut);
      if (!item) return res.status(404).json({ ok: false, error: 'shortcut not found' });
      const text = qr.render(item, body.vars || {});
      qr.markUsed(tenantOf(req), item.id);
      res.json({ ok: true, id: item.id, text: text });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Deterministic suggestions for an incoming message
  router.post('/quick-replies/suggest', function (req, res) {
    try {
      const body = req.body || {};
      res.json({ ok: true, suggestions: qr.suggest(tenantOf(req), body.text || '', { limit: body.limit }) });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // AI-enriched suggestion (best-effort, falls back to deterministic)
  router.post('/quick-replies/ai-suggest', async function (req, res) {
    try {
      const body = req.body || {};
      const out = await qr.aiSuggest(tenantOf(req), body.text || '', { limit: body.limit, useAI: body.useAI });
      res.json({ ok: true, result: out });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // Mark a reply as used (analytics)
  router.post('/quick-replies/:id/used', function (req, res) {
    try { res.json({ ok: true, item: qr.markUsed(tenantOf(req), req.params.id) }); }
    catch (e) { res.status(400).json({ ok: false, error: e.message }); }
  });

  return router;
}

function mount(app, opts) {
  opts = opts || {};
  const base = opts.base || '/api/ai';
  app.use(base, buildRouter());
  return app;
}

module.exports = { buildRouter: buildRouter, mount: mount };
