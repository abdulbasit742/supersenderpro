'use strict';
/**
 * routes/channelAutomation.js — Channel Automation Command Center API (Module 9).
 *
 * Mounted in server.js with:  app.use('/api', require('./routes/channelAutomation')(center));
 * so every path below is exposed under /api/channels/...
 *
 * Write endpoints are protected by an admin secret header (x-admin-secret) /
 * ?secret= query, validated against CHANNEL_ADMIN_SECRET (fallback ADMIN_TOKEN).
 * If no secret is configured the server logs a warning and allows the call (dev mode),
 * matching the project's "never hard-crash, give clear guidance" philosophy.
 */

const express = require('express');

module.exports = function (center) {
  const router = express.Router();

  function adminGuard(req, res, next) {
    const settings = center.getSettings();
    const configured = process.env.CHANNEL_ADMIN_SECRET || process.env.ADMIN_TOKEN || '';
    if (!settings.adminSecretRequired) return next();
    if (!configured) {
      console.warn('[ChannelCenter] CHANNEL_ADMIN_SECRET not set — write endpoint allowed in dev mode.');
      return next();
    }
    const provided = req.get('x-admin-secret') || req.query.secret || (req.body && req.body.secret);
    if (provided && provided === configured) return next();
    return res.status(401).json({ success: false, error: 'Unauthorized: missing/invalid admin secret', fix: 'Send x-admin-secret header matching CHANNEL_ADMIN_SECRET' });
  }

  const ok = (res, data) => res.json({ success: true, ...data });
  const fail = (res, err, code = 500) => res.status(code).json({ success: false, error: err && err.message ? err.message : String(err) });

  // ── Status / reporting ─────────────────────────────────────────────────────
  router.get('/channels/status', (req, res) => { try { ok(res, { status: center.status() }); } catch (e) { fail(res, e); } });
  router.get('/channels/doctor', (req, res) => { try { ok(res, { doctor: center.doctor() }); } catch (e) { fail(res, e); } });
  router.get('/channels/logs', (req, res) => { try { ok(res, { logs: center.getLogs().slice(-Number(req.query.limit || 100)) }); } catch (e) { fail(res, e); } });

  // ── Sources ─────────────────────────────────────────────────────────────────
  router.get('/channels/sources', (req, res) => { try { ok(res, { sources: center.refreshSourceHealth() }); } catch (e) { fail(res, e); } });
  router.post('/channels/sources', adminGuard, (req, res) => { try { ok(res, { source: center.addSource(req.body || {}) }); } catch (e) { fail(res, e); } });
  router.put('/channels/sources/:id', adminGuard, (req, res) => { try { const r = center.updateSource(req.params.id, req.body || {}); if (!r) return fail(res, 'source not found', 404); ok(res, { source: r }); } catch (e) { fail(res, e); } });
  router.delete('/channels/sources/:id', adminGuard, (req, res) => { try { center.removeSource(req.params.id); ok(res, {}); } catch (e) { fail(res, e); } });

  // ── Targets ───────────────────────────────────────────────────────────────
  router.get('/channels/targets', (req, res) => { try { ok(res, { targets: center.getTargets() }); } catch (e) { fail(res, e); } });
  router.post('/channels/targets', adminGuard, (req, res) => { try { ok(res, { target: center.addTarget(req.body || {}) }); } catch (e) { fail(res, e); } });
  router.put('/channels/targets/:id', adminGuard, (req, res) => { try { const r = center.updateTarget(req.params.id, req.body || {}); if (!r) return fail(res, 'target not found', 404); ok(res, { target: r }); } catch (e) { fail(res, e); } });
  router.delete('/channels/targets/:id', adminGuard, (req, res) => { try { center.removeTarget(req.params.id); ok(res, {}); } catch (e) { fail(res, e); } });

  // ── Queue ─────────────────────────────────────────────────────────────────
  router.get('/channels/queue', (req, res) => { try { ok(res, { queue: center.getQueue() }); } catch (e) { fail(res, e); } });
  router.post('/channels/queue/:id/approve', adminGuard, (req, res) => { try { const r = center.approveQueueItem(req.params.id, req.body || {}); res.status(r.success ? 200 : 404).json(r); } catch (e) { fail(res, e); } });
  router.post('/channels/queue/:id/reject', adminGuard, (req, res) => { try { const r = center.rejectQueueItem(req.params.id, (req.body || {}).reason || ''); res.status(r.success ? 200 : 404).json(r); } catch (e) { fail(res, e); } });
  router.post('/channels/queue/:id/publish', adminGuard, async (req, res) => { try { const r = await center.publishQueueItem(req.params.id); res.status(r.success ? 200 : 400).json(r); } catch (e) { fail(res, e); } });

  // ── Event ingestion (source post detected) ──────────────────────────────────
  router.post('/channels/events/source-post', adminGuard, async (req, res) => { try { ok(res, { result: await center.ingestSourcePost(req.body || {}) }); } catch (e) { fail(res, e); } });
  router.post('/channels/events/ecommerce', adminGuard, async (req, res) => { try { ok(res, { result: await center.ecommerceEvent(req.body || {}) }); } catch (e) { fail(res, e); } });

  // ── Test publish / dry-run ──────────────────────────────────────────────────
  router.post('/channels/test-publish', adminGuard, async (req, res) => {
    try {
      const body = req.body || {};
      // force a dry-run preview regardless of global setting unless live:true is sent
      const prev = center.getSettings().dryRun;
      if (body.live !== true) center.setDryRun(true);
      const result = await center.ingestSourcePost({ sourceId: body.sourceId, channelId: body.channelId, text: body.text || 'Test post from Channel Automation Center', mediaUrl: body.mediaUrl, mediaType: body.mediaType }, { publishNow: true });
      if (body.live !== true) center.setDryRun(prev);
      ok(res, { result });
    } catch (e) { fail(res, e); }
  });

  // ── Digest ──────────────────────────────────────────────────────────────────
  router.post('/channels/digest/generate', adminGuard, (req, res) => { try { ok(res, { digest: center.digest() }); } catch (e) { fail(res, e); } });
  router.get('/channels/digest', (req, res) => { try { ok(res, { digest: center.digest() }); } catch (e) { fail(res, e); } });

  // ── Control ──────────────────────────────────────────────────────────────────
  router.post('/channels/control', adminGuard, (req, res) => {
    try {
      const { action } = req.body || {};
      if (action === 'pause') return ok(res, { settings: center.pauseAll() });
      if (action === 'resume') return ok(res, { settings: center.resumeAll() });
      if (action === 'dry-run') return ok(res, { settings: center.setDryRun(true) });
      if (action === 'live') return ok(res, { settings: center.setDryRun(false) });
      return fail(res, 'unknown action (pause|resume|dry-run|live)', 400);
    } catch (e) { fail(res, e); }
  });
  router.get('/channels/settings', (req, res) => { try { ok(res, { settings: center.getSettings() }); } catch (e) { fail(res, e); } });
  router.put('/channels/settings', adminGuard, (req, res) => { try { ok(res, { settings: center.setSettings(req.body || {}) }); } catch (e) { fail(res, e); } });

  // ── Config export / import ────────────────────────────────────────────────
  router.post('/channels/export-config', adminGuard, (req, res) => { try { ok(res, { config: center.exportConfig() }); } catch (e) { fail(res, e); } });
  router.get('/channels/export-config', adminGuard, (req, res) => { try { ok(res, { config: center.exportConfig() }); } catch (e) { fail(res, e); } });
  router.post('/channels/import-config', adminGuard, (req, res) => { try { ok(res, center.importConfig(req.body || {})); } catch (e) { fail(res, e); } });

  // ── Manual fallback packets (WhatsApp channel) ──────────────────────────────
  router.get('/channels/manual-packets', (req, res) => { try { ok(res, { packets: center.manualPackets() }); } catch (e) { fail(res, e); } });
  router.post('/channels/manual-packets/:id/done', adminGuard, (req, res) => { try { ok(res, center.markPacketDone(req.params.id)); } catch (e) { fail(res, e); } });

  return router;
};
