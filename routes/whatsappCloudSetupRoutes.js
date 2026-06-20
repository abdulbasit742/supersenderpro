// routes/whatsappCloudSetupRoutes.js — Express router for Official WhatsApp Cloud Setup + Template Manager.
// Mounted at /api/whatsapp-cloud-setup. Dry-run safe: no live sends, no live Meta API, no token exposure, no PII.
'use strict';

const express = require('express');
const router = express.Router();

const setup = require('../lib/whatsappCloudSetup');
const templates = require('../lib/whatsappCloudTemplates');
const { redactPII, hasLeak } = setup.redactor;

// Wrap handlers: redact PII and block any accidental secret/PII leak before responding.
function safe(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) {
        const clean = redactPII(out);
        if (hasLeak(clean)) return res.status(500).json({ ok: false, error: 'response_blocked_pii_leak' });
        res.json(clean);
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'whatsapp_cloud_setup_error' });
    }
  };
}

/* ---------------- Setup wizard ---------------- */
router.get('/status', safe(() => setup.wizard.getStatus()));
router.get('/checklist', safe(() => setup.wizard.getChecklist()));
router.post('/checklist/update', safe((req) => {
  const { key, done } = req.body || {};
  return setup.wizard.updateChecklist(key, done);
}));
router.get('/readiness', safe(() => setup.wizard.getReadiness(templates.store.all())));
router.post('/validate-config', safe((req) => setup.wizard.applyConfig(req.body || {})));

/* ---------------- Webhook verification helper ---------------- */
router.get('/webhook-info', safe(() => setup.webhookVerifier.webhookInfo()));
router.post('/webhook-test-preview', safe((req) => setup.webhookVerifier.webhookTestPreview(req.body || {})));

/* ---------------- Send preview (dry-run, never sends) ---------------- */
router.post('/send-preview', safe((req) => setup.sendPreview.sendPreview(req.body || {})));

/* ---------------- Template manager ----------------
   NOTE: specific routes (report, sync-preview) are declared BEFORE the /:id routes so they are not
   shadowed by the dynamic id matcher. */
router.get('/templates/report', safe(() => templates.report()));
router.post('/templates/sync-preview', safe(() => templates.syncPreview.syncPreview()));

router.get('/templates', safe(() => ({ ok: true, templates: templates.store.all() })));
router.post('/templates', safe((req) => {
  const tpl = templates.store.upsert(req.body || {});
  const validation = templates.validator.validate(tpl);
  return { ok: true, template: tpl, validation };
}));
router.get('/templates/:id', safe((req) => {
  const t = templates.store.get(req.params.id);
  return t ? { ok: true, template: t } : { ok: false, error: 'not_found' };
}));
router.put('/templates/:id', safe((req) => {
  const t = templates.store.update(req.params.id, req.body || {});
  return t ? { ok: true, template: t } : { ok: false, error: 'not_found' };
}));
router.post('/templates/:id/preview', safe((req) => {
  const t = templates.store.get(req.params.id);
  if (!t) return { ok: false, error: 'not_found' };
  return Object.assign({ ok: true, template: { id: t.id, name: t.name } }, templates.preview.render(t, (req.body || {}).values || {}));
}));
router.post('/templates/:id/validate', safe((req) => {
  const t = templates.store.get(req.params.id);
  if (!t) return { ok: false, error: 'not_found' };
  return { ok: true, validation: templates.validator.validate(t), quality: templates.quality.assess(t) };
}));

module.exports = router;
