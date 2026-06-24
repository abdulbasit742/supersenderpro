'use strict';

/**
 * routes/campaigns.js
 * REST API for the Campaign Scheduler + Delivery Analytics feature.
 *
 * Wiring (add to server.js next to the other route mounts, e.g. line ~3012):
 *
 *   const { mountCampaigns } = require('./routes/campaigns');
 *   mountCampaigns(app, {
 *     // optional: plug in the live WhatsApp sender already used elsewhere
 *     sendMessage: async (to, message) => waClient.sendText(to, message),
 *   });
 *
 * If sendMessage is omitted the scheduler runs in safe dry-run mode so the
 * dashboard + analytics are fully usable without risking a live broadcast.
 */

const express = require('express');
const store = require('../lib/campaignStore');
const { CampaignScheduler } = require('../lib/campaignScheduler');

// Optional integrations: templates + contact segmentation.
// Loaded defensively so campaigns still work if those modules are absent.
let templates = null;
let contacts = null;
try { templates = require('../lib/templateStore'); } catch (_) {}
try { contacts = require('../lib/contactStore'); } catch (_) {}

function mountCampaigns(app, deps = {}) {
  const router = express.Router();
  const scheduler = new CampaignScheduler({
    sendMessage: deps.sendMessage || null,
    dryRun: deps.dryRun,
    logger: deps.logger,
  });
  scheduler.start();

  // List campaigns
  router.get('/campaigns', (req, res) => {
    res.json({ ok: true, campaigns: store.listCampaigns() });
  });

  // Create a campaign.
  // Message can come from `message` or a saved `templateId`.
  // Recipients can come from `recipients` or a contact `segment` ({tags,match}).
  router.post('/campaigns', (req, res) => {
    const body = Object.assign({}, req.body || {});

    // Resolve message from a template if requested.
    if ((!body.message || !String(body.message).trim()) && body.templateId && templates) {
      const t = templates.getTemplate(body.templateId);
      if (t) body.message = t.body;
    }
    if (!body.message || !String(body.message).trim()) {
      return res.status(400).json({ ok: false, error: 'message or valid templateId is required' });
    }

    // Resolve recipients from a contact segment if none supplied directly.
    let recipients = store.normalizeRecipients(body.recipients);
    if (recipients.length === 0 && body.segment && contacts) {
      recipients = contacts.toRecipients(body.segment);
      body.recipients = recipients;
    }
    if (recipients.length === 0) {
      return res.status(400).json({ ok: false, error: 'at least one recipient (or matching segment) is required' });
    }

    const campaign = store.createCampaign(body);
    res.status(201).json({ ok: true, campaign });
  });

  // Get one campaign
  router.get('/campaigns/:id', (req, res) => {
    const c = store.getCampaign(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, campaign: c });
  });

  // Delete a campaign
  router.delete('/campaigns/:id', (req, res) => {
    const ok = store.deleteCampaign(req.params.id);
    if (!ok) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true });
  });

  // Start now
  router.post('/campaigns/:id/start', async (req, res) => {
    const c = store.getCampaign(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    scheduler.runCampaign(c.id).catch(() => {});
    res.json({ ok: true, status: 'started' });
  });

  // Pause
  router.post('/campaigns/:id/pause', (req, res) => {
    const c = scheduler.pauseCampaign(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, campaign: c });
  });

  // Resume
  router.post('/campaigns/:id/resume', (req, res) => {
    const c = scheduler.resumeCampaign(req.params.id);
    if (!c) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, campaign: c });
  });

  // Per-campaign analytics
  router.get('/campaigns/:id/analytics', (req, res) => {
    const a = store.campaignAnalytics(req.params.id);
    if (!a) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, analytics: a });
  });

  // Dashboard summary analytics
  router.get('/campaigns-analytics/summary', (req, res) => {
    res.json({ ok: true, summary: store.summaryAnalytics() });
  });

  // Webhook for external delivery/read receipts (e.g. WA Sender callbacks)
  router.post('/campaigns/:id/receipt', (req, res) => {
    const { to, status } = req.body || {};
    if (!to || !['delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'to and valid status required' });
    }
    const entry = store.updateLogEntry(req.params.id, to, { status });
    if (!entry) return res.status(404).json({ ok: false, error: 'recipient not found' });
    res.json({ ok: true, entry });
  });

  app.use('/api', router);
  return { router, scheduler };
}

module.exports = { mountCampaigns };
