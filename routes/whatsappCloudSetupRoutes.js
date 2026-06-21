'use strict';

/**
    * WhatsApp Cloud API Production Setup Wizard — Express router.
    *
    * Mount in server.js (inside the marked hook):
    *   const whatsappCloudSetupRoutes = require('./routes/whatsappCloudSetupRoutes');
    *     app.use('/api/whatsapp-cloud-setup', whatsappCloudSetupRoutes);
    *
    * SAFETY:
    * - Read-only against the existing Cloud API config.
    * - Dry-run by default. Never sends real messages. Never calls Meta unless an existing
    *   live-test implementation is wired AND WHATSAPP_CLOUD_LIVE_TEST=true.
    * - Never returns secret values.
    * - Does not touch Baileys / local WhatsApp / orders / payments / customers.
    */


const express = require('express');
const router = express.Router();


const configInspector = require('../lib/whatsappCloudSetup/configInspector');
const templateRegistry = require('../lib/whatsappCloudSetup/templateRegistry');
const payloadBuilder = require('../lib/whatsappCloudSetup/payloadBuilder');
const webhookDiagnostics = require('../lib/whatsappCloudSetup/webhookDiagnostics');
const history = require('../lib/whatsappCloudSetup/historyStore');


function liveTestEnabled() {
        return configInspector.boolEnv('WHATSAPP_CLOUD_LIVE_TEST', false);
}
function dryRunEnabled() {
  return configInspector.boolEnv('WHATSAPP_CLOUD_DRY_RUN', true);
}
function wizardEnabled() {
        return configInspector.boolEnv('WHATSAPP_CLOUD_SETUP_ENABLED', true);
}

// Lightweight guard so the wizard can be turned off entirely via env.
router.use(function (req, res, next) {
  if (!wizardEnabled()) {
    return res.status(404).json({ ok: false, error: 'wizard_disabled', message: 'WhatsApp Cloud Setup Wizard is disabled (WHATSAPP_CLOUD_SETUP_ENABLED=false).' });
        }
        next();
});

function wrap(handler) {
  return function (req, res) {

    try {
      handler(req, res);
    } catch (e) {
    res.status(500).json({ ok: false, error: 'internal_error', message: 'Unexpected error in WhatsApp Cloud Setup Wizard.' });
    }
  };
}

// GET /status — overall wizard + config + mode state
router.get('/status', wrap(function (req, res) {
  const cfg = configInspector.inspectConfig();
  res.json({
    ok: true,
    feature: 'whatsapp-cloud-setup-wizard',
    mode: { dryRun: dryRunEnabled(), liveTest: liveTestEnabled() },
    configured: cfg.configured,
    enabled: cfg.enabled,
    missingCount: cfg.missing.length,
    missing: cfg.missing,
    warnings: cfg.warnings,
    templates: templateRegistry.summary(),
    history: history.status(),
    baileys: 'untouched',
  });
}));


// GET /config — safe (masked) config inspection
router.get('/config', wrap(function (req, res) {
res.json(Object.assign({ ok: true }, configInspector.inspectConfig()));
}));

// GET /templates — local template registry
router.get('/templates', wrap(function (req, res) {
res.json({ ok: true, summary: templateRegistry.summary(), templates: templateRegistry.listTemplates() });
}));


// POST /templates/preview — build a dry-run payload preview
router.post('/templates/preview', wrap(function (req, res) {
  const body = req.body || {};
  const result = payloadBuilder.buildTemplatePreview({
    templateName: body.templateName || body.name,
    to: body.to,
    language: body.language,
    params: body.params,
  });
  if (!result.ok) return res.status(400).json(result);


  history.record({
    action: 'template_preview',
    dryRun: true,
    status: 'ok',
    message: 'Built dry-run payload preview.',
    maskedTarget: result.maskedTo,
    templateName: result.template.name,
    warnings: result.warnings,
  });

res.json(result);
}));

// POST /templates/test — dry-run by default; live only if explicitly enabled
router.post('/templates/test', wrap(function (req, res) {
const body = req.body || {};
const preview = payloadBuilder.buildTemplatePreview({
    templateName: body.templateName || body.name,
    to: body.to,
    language: body.language,
    params: body.params,
});
if (!preview.ok) return res.status(400).json(preview);

const live = liveTestEnabled() && body.live === true;


if (!live) {
    history.record({
      action: 'template_test',
      dryRun: true,
      status: 'dry-run',
      message: 'Dry-run test only. No message sent, no Meta API called.',
      maskedTarget: preview.maskedTo,
      templateName: preview.template.name,
      warnings: preview.warnings,
    });
    return res.json({
      ok: true,
      mode: 'dry-run',
      live: false,
      payloadPreview: preview.payloadPreview,
      template: preview.template,
      maskedTo: preview.maskedTo,
      warnings: preview.warnings,
      note: 'WHATSAPP_CLOUD_LIVE_TEST is false (or live not requested). Nothing was sent.',
    });
}


// LIVE path: intentionally NOT wired to send here. Defer to an existing, audited
// Cloud API sender only if one is provided by the host app. This wizard refuses to
// invent a Meta call. Report clearly that operator action is required.
history.record({
  action: 'template_test',
    dryRun: false,
    status: 'live-requested',
    message: 'Live test requested but no audited sender is wired in this wizard.',
    maskedTarget: preview.maskedTo,
    templateName: preview.template.name,
    warnings: preview.warnings,
});
res.status(501).json({
    ok: false,
    mode: 'live',
    live: true,
    error: 'live_sender_not_wired',
  message: 'Live test is enabled, but this isolated wizard does not call Meta directly. Wire it to your existing audited Cloud API sender to enable live tests.',

  maskedTo: preview.maskedTo,
  template: preview.template,
  warnings: preview.warnings.concat(['Live mode never prints tokens or full Meta responses.']),
});
}));


// GET /webhook-diagnostics — advisory checklist
router.get('/webhook-diagnostics', wrap(function (req, res) {
res.json(Object.assign({ ok: true }, webhookDiagnostics.diagnose()));
}));


// GET /history — recent safe history
router.get('/history', wrap(function (req, res) {
const limit = parseInt(req.query.limit, 10);
res.json({ ok: true, entries: history.list(Number.isFinite(limit) ? limit : 50), status: history.status() });
}));


// DELETE /history/:id — delete one local history item
router.delete('/history/:id', wrap(function (req, res) {
const removed = history.remove(req.params.id);
res.status(removed ? 200 : 404).json({ ok: removed, removed: removed });
}));


module.exports = router;
