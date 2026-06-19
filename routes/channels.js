'use strict';

/**
 * routes/channels.js — REST API for channel-to-channel content sharing.
 *
 * Wiring (near other route mounts in server.js):
 *   const { mountChannelSharing } = require('./routes/channels');
 *   mountChannelSharing(app, {
 *     senders: {
 *       whatsapp:  async (chId, text, media) => waChannelPublisher.post(chId, text, media),
 *       telegram:  async (chId, text, media) => telegramBridge.post(chId, text, media),
 *       facebook:  async (chId, text, media) => socialHub.postUpdate('facebook', text),
 *       instagram: async (chId, text, media) => socialHub.postUpdate('instagram', text),
 *     },
 *   });
 *
 * Then feed source-channel posts to POST /api/channels/ingest (or call
 * require('./lib/channelSharing/engine').processPost(post, { senders })).
 */

const express = require('express');
const store = require('../lib/channelSharing/store');
const engine = require('../lib/channelSharing/engine');

function mountChannelSharing(app, deps = {}) {
  const router = express.Router();
  const senders = deps.senders || {};

  // ---- settings + presets ----
  router.get('/channels/settings', (req, res) => res.json({ ok: true, settings: store.getSettings(), presets: store.PRESETS }));
  router.put('/channels/settings', (req, res) => res.json({ ok: true, settings: store.updateSettings(req.body || {}) }));

  // ---- routes (source -> targets) ----
  router.get('/channels/routes', (req, res) => res.json({ ok: true, routes: store.listRoutes() }));
  router.post('/channels/routes', (req, res) => {
    const b = req.body || {};
    if (!Array.isArray(b.sources) || !b.sources.length) return res.status(400).json({ ok: false, error: 'sources[] required' });
    if (!Array.isArray(b.targets) || !b.targets.length) return res.status(400).json({ ok: false, error: 'targets[] required' });
    res.status(201).json({ ok: true, route: store.createRoute(b) });
  });
  router.put('/channels/routes/:id', (req, res) => {
    const r = store.updateRoute(req.params.id, req.body || {});
    if (!r) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, route: r });
  });
  router.delete('/channels/routes/:id', (req, res) => {
    if (!store.deleteRoute(req.params.id)) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  // ---- blacklist ----
  router.get('/channels/blacklist', (req, res) => res.json({ ok: true, blacklist: store.getBlacklist() }));
  router.put('/channels/blacklist', (req, res) => res.json({ ok: true, blacklist: store.setBlacklist((req.body || {}).blacklist || []) }));

  // ---- ingest a source post (webhook from your channel watcher) ----
  router.post('/channels/ingest', async (req, res) => {
    try {
      const out = await engine.processPost(req.body || {}, { senders });
      res.json({ ok: true, ...out });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // ---- preview transforms without sending ----
  router.post('/channels/preview', (req, res) => {
    const b = req.body || {};
    const scrubber = require('../lib/channelSharing/scrubber');
    const content = scrubber.transform(b.text || '', b.transform || {});
    res.json({ ok: true, content, filter: scrubber.passesFilters(content, b.filter || {}) });
  });

  // ---- drafts (manual approval queue) ----
  router.get('/channels/drafts', (req, res) => res.json({ ok: true, drafts: store.listDrafts() }));
  router.post('/channels/drafts/:id/approve', async (req, res) => {
    res.json(await engine.approveDraft(req.params.id, senders));
  });
  router.delete('/channels/drafts/:id', (req, res) => { store.removeDraft(req.params.id); res.json({ ok: true }); });

  // ---- logs ----
  router.get('/channels/logs', (req, res) => res.json({ ok: true, logs: store.listLogs((req.query.limit && +req.query.limit) || 100) }));

  app.use('/api', router);
  return { router };
}

module.exports = { mountChannelSharing };
