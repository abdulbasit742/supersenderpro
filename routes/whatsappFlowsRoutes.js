  'use strict';
  /**
   * routes/whatsappFlowsRoutes.js — WhatsApp Flows (native in-chat forms) API.
   * Preview-only / dry-run. No live WhatsApp send, no live Flow publish to Meta,
   * no external calls, no secrets, no full PII. express.json() for POST/PUT.
   */
  const express = require('express');
  const router = express.Router();

  const service = require('../lib/whatsappFlows/flowService');
  const validator = require('../lib/whatsappFlows/flowValidator');
  const runner = require('../lib/whatsappFlows/flowRunnerPreview');
  const responseStore = require('../lib/whatsappFlows/responseStore');
  const responsePreview = require('../lib/whatsappFlows/responsePreview');
  const componentTypes = require('../lib/whatsappFlows/componentTypes');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function flowOr404(id, res) { const f = service.get(id); if (!f) res.status(404).json({ ok: false, error: 'not_found' });
  return f; }


  router.get('/status', wrap(function (req, res) {
    service.ensureSeeded();
    res.json({ ok: true, module: 'whatsapp-flows', dryRun: true, liveActionsEnabled: false, liveSend: false, livePublish:
  false, externalCalls: false, flows: service.list().length, componentTypes: Object.keys(componentTypes.TYPES).length,
  warnings: [], blockers: [], timestamp: new Date().toISOString() });
  }));


  router.get('/component-types', wrap(function (req, res) { res.json({ ok: true, dryRun: true, componentTypes:
  componentTypes.TYPES }); }));


  router.get('/flows', wrap(function (req, res) { res.json({ ok: true, dryRun: true, flows: service.list(req.query) });
  }));
  router.post('/flows', wrap(function (req, res) { const r = service.create(req.body || {}); return r.ok ? res.json(r) :
  res.status(400).json({ ok: false, errors: r.errors }); }));
  router.get('/flows/:id', wrap(function (req, res) { const f = flowOr404(req.params.id, res); if (f) res.json({ ok: true,
  dryRun: true, flow: f }); }));
  router.put('/flows/:id', wrap(function (req, res) { const r = service.update(req.params.id, req.body || {}); return r.ok
  ? res.json(r) : res.status(r.errors.includes('not_found') ? 404 : 400).json({ ok: false, errors: r.errors }); }));

  router.post('/flows/:id/validate', wrap(function (req, res) { const f = flowOr404(req.params.id, res); if (!f) return;
  res.json(Object.assign({ ok: true, dryRun: true, flowId: f.id }, validator.validate(f))); }));

// Step through one screen with submitted answers (validation + advance preview).
router.post('/flows/:id/run-preview', wrap(function (req, res) {
 const f = flowOr404(req.params.id, res); if (!f) return;
 const b = req.body || {};
 res.json(runner.run(f, { screenId: b.screenId, answers: b.answers }));
}));

// Full dry walk-through of the whole flow with answers per screen.
router.post('/flows/:id/walk-preview', wrap(function (req, res) {
 const f = flowOr404(req.params.id, res); if (!f) return;
 res.json(runner.walk(f, (req.body && req.body.answersByScreen) || {}));
}));

// Capture a completed response (PREVIEW): masked + stored locally; never sent anywhere.
router.post('/flows/:id/submit-preview', wrap(function (req, res) {
 const f = flowOr404(req.params.id, res); if (!f) return;
 const b = req.body || {};
 if (f.consentRequired && b.answers && b.answers.consent !== true && !Object.keys(b.answers).some((k) =>
/consent|optin/i.test(k) && b.answers[k] === true)) {
   return res.json({ ok: true, dryRun: true, liveSend: false, captured: false, warnings: ['consent_required_not_given'],
blockers: [] });
 }
 const rec = responseStore.add(f.id, b.answers || {});
 res.json({ ok: true, dryRun: true, liveSend: false, captured: true, responseId: rec.id, answersMasked:
rec.answersMasked, warnings: [], blockers: [] });
}));

router.get('/responses', wrap(function (req, res) { res.json({ ok: true, dryRun: true, responses:
responseStore.list(req.query.flowId, 50) }); }));
router.get('/analytics', wrap(function (req, res) { service.ensureSeeded();
res.json(responsePreview.overview(service.list().map((f) => ({ id: f.id, name: f.name })))); }));


// Publish is BLOCKED by design (no Meta call).
router.post('/flows/:id/publish-preview', wrap(function (req, res) {
 const f = flowOr404(req.params.id, res); if (!f) return;
 const v = validator.validate(f);
 res.json({ ok: true, dryRun: true, livePublish: false, flowId: f.id, wouldPublish: v.ok, validation: v, note: 'Publish to Meta is disabled in this layer. Validation preview only.', warnings: v.warnings, blockers: [] });
}));



router.get('/summary', wrap(function (req, res) {
  service.ensureSeeded();
  const flows = service.list();
  const responses = responseStore.list(null, 1000);
  const byCategory = flows.reduce((m, f) => { m[f.category] = (m[f.category] || 0) + 1; return m; }, {});
  res.json({ ok: true, dryRun: true, liveActionsEnabled: false, totalFlows: flows.length, byCategory, totalResponsesPreview: responses.length, warnings: [], blockers: [] });
}));

module.exports = router;
