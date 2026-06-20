// routes/developerPortalRoutes.js — Developer API + Webhook Event Hub + External Integration Portal.
// ALL routes are preview/dry-run safe: no live webhook delivery by default, no real API secrets in
// responses, no full PII. Mounted at /api/developer-portal by server.js.
const express = require('express');
const router = express.Router();

const registry = require('../lib/developerPortal/developerRegistry');
const apiCatalog = require('../lib/developerPortal/apiCatalog');
const eventCatalog = require('../lib/developerPortal/webhookEventCatalog');
const subs = require('../lib/developerPortal/webhookSubscriptions');
const deliveryPreview = require('../lib/developerPortal/webhookDeliveryPreview');
const replay = require('../lib/developerPortal/webhookReplay');
const deliveryLog = require('../lib/developerPortal/webhookDeliveryLog');
const { SCOPES } = require('../lib/developerPortal/scopes');
const rateLimits = require('../lib/developerPortal/rateLimits');
const adapters = require('../lib/developerPortal/adapters');
const flowNodes = require('../lib/developerPortal/flowNodes');
const integrationApps = require('../lib/developerPortal/integrationApps');
const { policy } = require('../lib/developerPortal/safetyGuard');
const store = require('../lib/developerPortal/store');

const ok = (res, data) => res.json({ success: true, ...data });
const fail = (res, err, code = 500) => res.status(code).json({ success: false, error: err.message || String(err) });

// ── Status ────────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  try {
    const p = policy();
    ok(res, {
      service: 'developer-portal',
      enabled: p.enabled,
      safety: { dryRun: p.dryRun, allowLiveWebhooks: p.allowLiveWebhooks, allowRealKeys: p.allowRealKeys, requireApprovalForWebhooks: p.requireApprovalForWebhooks, redactPayloads: p.redactPayloads },
      counts: { apps: registry.listApps().length, webhooks: subs.listSubs().length, events: eventCatalog.eventTypes().length },
      adaptersAvailable: adapters.available(),
    });
  } catch (e) { fail(res, e); }
});

// ── Developer Apps ──────────────────────────────────────────────────────────
router.get('/apps', (req, res) => { try { ok(res, { apps: registry.listApps() }); } catch (e) { fail(res, e); } });
router.post('/apps', (req, res) => { try { ok(res, { app: registry.createApp(req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/apps/:id', (req, res) => { try { const a = registry.getApp(req.params.id); if (!a) return fail(res, new Error('App not found'), 404); ok(res, { app: a }); } catch (e) { fail(res, e); } });
router.put('/apps/:id', (req, res) => { try { const a = registry.updateApp(req.params.id, req.body || {}); if (!a) return fail(res, new Error('App not found'), 404); ok(res, { app: a }); } catch (e) { fail(res, e); } });
router.post('/apps/:id/revoke-preview', (req, res) => { try { const a = registry.revokePreview(req.params.id); if (!a) return fail(res, new Error('App not found'), 404); ok(res, { app: a }); } catch (e) { fail(res, e); } });

// API key preview (one-time; DEMO unless explicitly enabled). Never persists raw key.
router.post('/apps/:id/api-key-preview', (req, res) => {
  try { const r = registry.issueKeyPreview(req.params.id); if (!r) return fail(res, new Error('App not found'), 404);
    ok(res, { app: r.app, isDemo: r.isDemo, apiKeyOneTime: r.oneTimeKey, note: r.note });
  } catch (e) { fail(res, e); }
});
router.post('/apps/:id/rotate-key-preview', (req, res) => {
  try { const r = registry.issueKeyPreview(req.params.id); if (!r) return fail(res, new Error('App not found'), 404);
    ok(res, { app: r.app, isDemo: r.isDemo, apiKeyOneTime: r.oneTimeKey, note: 'Rotated. ' + r.note });
  } catch (e) { fail(res, e); }
});
router.get('/apps/:id/rate-limit-preview', (req, res) => {
  try { const a = registry.getApp(req.params.id); if (!a) return fail(res, new Error('App not found'), 404);
    ok(res, { tier: a.rateLimitTier, limits: rateLimits.tier(a.rateLimitTier) });
  } catch (e) { fail(res, e); }
});

// ── API Catalog ─────────────────────────────────────────────────────────────
router.get('/api-catalog', (req, res) => { try { ok(res, apiCatalog.catalog(req.query.module)); } catch (e) { fail(res, e); } });
router.get('/openapi.json', (req, res) => { try { res.json(apiCatalog.openapi()); } catch (e) { fail(res, e); } });
router.get('/scopes', (req, res) => { try { ok(res, { scopes: SCOPES }); } catch (e) { fail(res, e); } });

// ── Webhook Events ───────────────────────────────────────────────────────────
router.get('/events', (req, res) => { try { ok(res, { events: eventCatalog.list() }); } catch (e) { fail(res, e); } });

// ── Webhook Subscriptions ─────────────────────────────────────────────────────
router.get('/webhooks', (req, res) => { try { ok(res, { webhooks: subs.listSubs() }); } catch (e) { fail(res, e); } });
router.post('/webhooks', (req, res) => { try { ok(res, { webhook: subs.createSub(req.body || {}) }); } catch (e) { fail(res, e, 400); } });
router.get('/webhooks/:id', (req, res) => { try { const s = subs.getSub(req.params.id); if (!s) return fail(res, new Error('Subscription not found'), 404); ok(res, { webhook: s }); } catch (e) { fail(res, e); } });
router.put('/webhooks/:id', (req, res) => { try { const s = subs.updateSub(req.params.id, req.body || {}); if (!s) return fail(res, new Error('Subscription not found'), 404); ok(res, { webhook: s }); } catch (e) { fail(res, e); } });

// Dry-run test + replay (NO live delivery unless explicitly enabled by env policy)
router.post('/webhooks/:id/test-preview', async (req, res) => {
  try { const r = await deliveryPreview.deliverPreview(req.params.id, (req.body && req.body.eventType) || 'generic.system_notice', (req.body && req.body.overrides) || {}); ok(res, { delivery: r }); }
  catch (e) { fail(res, e); }
});
router.post('/webhooks/:id/replay-preview', async (req, res) => {
  try { const r = await replay.replayPreview(req.params.id, (req.body && req.body.eventType), (req.body && req.body.overrides) || {}); ok(res, { delivery: r }); }
  catch (e) { fail(res, e); }
});
router.get('/webhooks/:id/deliveries', (req, res) => { try { ok(res, { deliveries: deliveryLog.list(req.params.id) }); } catch (e) { fail(res, e); } });

// ── Adapters / Integration apps / Flow nodes ──────────────────────────────────
router.get('/adapters', (req, res) => { try { ok(res, { adapters: adapters.statuses() }); } catch (e) { fail(res, e); } });
router.get('/integration-apps', (req, res) => { try { ok(res, { apps: integrationApps.APPS }); } catch (e) { fail(res, e); } });
router.get('/flow-nodes', (req, res) => { try { ok(res, { triggers: flowNodes.TRIGGERS, actions: flowNodes.ACTIONS }); } catch (e) { fail(res, e); } });

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const apps = registry.listApps();
    const webhooks = subs.listSubs();
    ok(res, {
      overview: {
        apps: apps.length,
        activePreviewApps: apps.filter(a => a.status === 'active_preview').length,
        webhookSubscriptions: webhooks.length,
        enabledEvents: eventCatalog.eventTypes().length,
        deliveryPreviews: deliveryLog.list(null, 500).length,
        blockedDeliveries: deliveryLog.list(null, 500).filter(d => d.status === 'blocked_by_policy').length,
        adaptersAvailable: adapters.available().length,
      },
      safety: policy(),
    });
  } catch (e) { fail(res, e); }
});
router.get('/history', (req, res) => { try { ok(res, store.read(store.PATHS.history(), { events: [] })); } catch (e) { fail(res, e); } });
router.get('/doctor', (req, res) => {
  try {
    const p = policy();
    const checks = [
      { check: 'portal_enabled', pass: p.enabled },
      { check: 'dry_run_default', pass: p.dryRun === true },
      { check: 'live_webhooks_disabled', pass: p.allowLiveWebhooks === false },
      { check: 'real_keys_disabled', pass: p.allowRealKeys === false },
      { check: 'redaction_on', pass: p.redactPayloads === true },
    ];
    ok(res, { healthy: checks.every(c => c.pass), checks });
  } catch (e) { fail(res, e); }
});
router.post('/report/generate', (req, res) => {
  try {
    ok(res, { report: {
      generatedAt: new Date().toISOString(),
      apps: registry.listApps().length,
      webhooks: subs.listSubs().length,
      events: eventCatalog.eventTypes().length,
      adapters: adapters.statuses(),
      safety: policy(),
    } });
  } catch (e) { fail(res, e); }
});

module.exports = router;
