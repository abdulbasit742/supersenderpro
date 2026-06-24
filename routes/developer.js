'use strict';

/**
 * routes/developer.js — API keys + outbound webhooks management.
 *
 * Wiring:
 *   const { mountDeveloper } = require('./routes/developer');
 *   mountDeveloper(app);
 *
 * Protect any external route with the exported middleware:
 *   const { requireApiKey } = require('./lib/apiKeyStore');
 *   app.use('/api/ext', requireApiKey('send'));
 */

const express = require('express');
const keys = require('../lib/apiKeyStore');
const hooks = require('../lib/webhookStore');

function mountDeveloper(app, deps = {}) {
  const router = express.Router();
  const http = deps.http; // optional injected http for webhook tests

  // ---- API keys ----
  router.get('/dev/keys', (req, res) => res.json({ ok: true, keys: keys.list() }));
  router.post('/dev/keys', (req, res) => {
    const b = req.body || {};
    const created = keys.generate(b.label, b.scopes);
    // raw key returned ONCE
    res.status(201).json({ ok: true, ...created, note: 'Store this key now — it will not be shown again.' });
  });
  router.delete('/dev/keys/:id', (req, res) => {
    if (!keys.revoke(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, revoked: true });
  });

  // ---- webhooks ----
  router.get('/dev/webhooks', (req, res) => res.json({ ok: true, events: hooks.EVENTS, webhooks: hooks.listWebhooks() }));
  router.post('/dev/webhooks', (req, res) => {
    if (!(req.body && req.body.url)) return res.status(400).json({ ok: false, error: 'url required' });
    res.status(201).json({ ok: true, webhook: hooks.createWebhook(req.body) });
  });
  router.put('/dev/webhooks/:id', (req, res) => {
    const w = hooks.updateWebhook(req.params.id, req.body || {});
    if (!w) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, webhook: w });
  });
  router.delete('/dev/webhooks/:id', (req, res) => {
    if (!hooks.deleteWebhook(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });
  router.post('/dev/webhooks/test', async (req, res) => {
    const event = (req.body && req.body.event) || 'campaign.completed';
    try { res.json({ ok: true, results: await hooks.dispatch(event, { test: true }, http) }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  app.use('/api', router);
  return { router };
}

module.exports = { mountDeveloper };
