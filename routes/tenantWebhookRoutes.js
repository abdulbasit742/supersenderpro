// routes/tenantWebhookRoutes.js — API #2: tenant-facing outbound webhooks.
//
// Lets a tenant connect SuperSender to their own systems (Zapier/Make/custom): register a URL that
// fires on events like new_lead, payment_received, stage_change. Built ON TOP of the SSRF-safe
// dispatcher from PR #33 (lib/webhookDispatcher.js) so deliveries are HMAC-signed and can't hit
// internal addresses.
//
// Wire-up (server.js):
//   const WebhookDispatcher = require('./lib/webhookDispatcher');
//   const dispatcher = new WebhookDispatcher();
//   const whRoutes = require('./routes/tenantWebhookRoutes');
//   whRoutes.setDispatcher(dispatcher);
//   app.use('/api/webhooks', whRoutes);
//   // fan workflow events out to tenant webhooks:
//   const workflow = require('./lib/workflows/workflowEngine');
//   workflow.registerAction('fire_webhook', async (p, ctx) => dispatcher.dispatch(ctx.tenantId || 'default', p.event || ctx.event, ctx));

const express = require('express');
const router = express.Router();

let dispatcher = null;
router.setDispatcher = (d) => { dispatcher = d || null; };

function ensure(res) {
  if (!dispatcher) { res.status(503).json({ ok: false, error: 'Webhook dispatcher not available' }); return false; }
  return true;
}

// Register. Body: { events?: string[], url, secret? }   (storeId/tenantId in :tenantId)
router.post('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  const { url, events, secret } = req.body || {};
  try {
    const hook = dispatcher.registerWebhook(req.params.tenantId, url, events || [], secret || '');
    res.json({ ok: true, webhook: hook });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// List for a tenant.
router.get('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, webhooks: dispatcher.listWebhooks(req.params.tenantId) });
});

// Enable/disable. Body: { active }
router.post('/:tenantId/:id/active', (req, res) => {
  if (!ensure(res)) return;
  const hook = dispatcher.setActive(req.params.tenantId, req.params.id, !!(req.body || {}).active);
  if (!hook) return res.status(404).json({ ok: false, error: 'Webhook not found' });
  res.json({ ok: true, webhook: hook });
});

// Delete.
router.delete('/:tenantId/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...dispatcher.deleteWebhook(req.params.tenantId, req.params.id) });
});

// Test fire. Body: { event?, payload? }
router.post('/:tenantId/test', async (req, res) => {
  if (!ensure(res)) return;
  const { event, payload } = req.body || {};
  try {
    const result = await dispatcher.dispatch(req.params.tenantId, event || 'new_lead', payload || { test: true });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delivery logs.
router.get('/:tenantId/logs', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, logs: dispatcher.getDeliveryLogs(req.params.tenantId, Number(req.query.limit) || 100) });
});

module.exports = router;
