 'use strict';

 /**
  * No-Code Flows — Express router. Dry-run / preview only. No live sends, no external
  * calls, no secrets/full PII. Errors caught; no stack traces exposed.
  *
  * Mount (inside marked hook):
  *    const noCodeFlowsRoutes = require('./routes/noCodeFlowsRoutes');
  *    app.use('/api/no-code-flows', noCodeFlowsRoutes);
  */

 const express = require('express');
 const router = express.Router();

 const flowModel = require('../lib/noCodeFlows/flowModel');
 const registry = require('../lib/noCodeFlows/nodeRegistry');
 const validator = require('../lib/noCodeFlows/flowValidator');
 const previewRunner = require('../lib/noCodeFlows/flowPreviewRunner');
 const analytics = require('../lib/noCodeFlows/campaignAnalytics');
 const timeline = require('../lib/noCodeFlows/campaignTimeline');

 function enabled() { return String(process.env.NO_CODE_FLOWS_ENABLED || 'true').toLowerCase() !== 'false'; }
 router.use(function (req, res, next) { if (!enabled()) return res.status(404).json({ ok: false, error:
 'no_code_flows_disabled' }); next(); });
 function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
 'internal_error' }); } }; }


 router.get('/status', wrap(function (req, res) {
   res.json({ ok: true, feature: 'no-code-flows', dryRun: true, liveActionsEnabled: false, store: flowModel.statusInfo(),
 nodeTypes: registry.list().length });
 }));

 // flows CRUD
 router.get('/flows', wrap(function (req, res) { res.json({ ok: true, flows: flowModel.list() }); }));
 router.post('/flows', wrap(function (req, res) { res.status(201).json({ ok: true, flow: flowModel.create(req.body || {})
 }); }));
 router.get('/flows/:id', wrap(function (req, res) { const f = flowModel.get(req.params.id); return f ? res.json({ ok:
 true, flow: f }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
 router.put('/flows/:id', wrap(function (req, res) { const f = flowModel.update(req.params.id, req.body || {}); return f ?
 res.json({ ok: true, flow: f }) : res.status(404).json({ ok: false, error: 'not_found' }); }));


 // validate + preview-run
 router.post('/flows/:id/validate', wrap(function (req, res) { const f = flowModel.get(req.params.id); if (!f) return
 res.status(404).json({ ok: false, error: 'not_found' }); res.json(Object.assign({ ok: true }, validator.validate(f)));
 }));
 router.post('/flows/:id/preview-run', wrap(function (req, res) { const f = flowModel.get(req.params.id); if (!f) return
 res.status(404).json({ ok: false, error: 'not_found' }); res.json(previewRunner.run(f, (req.body && req.body.sample) ||

null)); }));

// node registry
router.get('/node-registry', wrap(function (req, res) { res.json({ ok: true, nodes: registry.list(), triggers:
registry.triggers(), actions: registry.actions() }); }));

// campaigns
router.get('/campaigns', wrap(function (req, res) { res.json({ ok: true, campaigns: analytics.list() }); }));
router.get('/campaigns/:id/analytics', wrap(function (req, res) { res.json(Object.assign({ ok: true },
analytics.analytics(req.params.id))); }));
router.get('/campaigns/:id/timeline', wrap(function (req, res) { res.json(Object.assign({ ok: true },
timeline.timeline(req.params.id))); }));

module.exports = router;
