'use strict';

/**
 * Mock Gateway — Express router. Offline-only / dry-run. No external calls, no live
 * actions, no secrets/full PII in responses. Always returns dryRun true.
 *
 * Mount (inside marked hook):
 *     const mockGatewayRoutes = require('./routes/mockGatewayRoutes');
 *     app.use('/api/mock-gateway', mockGatewayRoutes);
 */

const express = require('express');
const router = express.Router();

const gateway = require('../lib/mockGateway');
const registry = require('../lib/mockGateway/mockRegistry');
const scenarios = require('../lib/mockGateway/mockScenarios');
const runner = require('../lib/mockGateway/mockScenarioRunner');
const sanitizer = require('../lib/mockGateway/mockInputSanitizer');
const eventStore = require('../lib/mockGateway/mockEventStore');
const doctor = require('../lib/mockGateway/mockGatewayDoctor');
const adapters = require('../lib/mockGateway/adapters');
const safety = require('../lib/mockGateway/mockSafety');

router.use(function (req, res, next) { if (!safety.enabled()) return res.status(404).json({ ok: false, error:
'mock_gateway_disabled' }); next(); });
function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
'internal_error' }); } }; }

router.get('/status', wrap(function (req, res) { res.json(Object.assign({ ok: true }, gateway.status(), { adapters:
adapters.statusAll() })); }));

router.get('/providers', wrap(function (req, res) { res.json({ ok: true, providers: registry.list() }); }));
router.get('/providers/:provider/status', wrap(function (req, res) {
  const mod = registry.get(req.params.provider);
     if (!mod || typeof mod.getStatus !== 'function') return res.status(404).json({ ok: false, error: 'unknown_provider' });
     res.json({ ok: true, status: mod.getStatus() });
}));

router.get('/scenarios', wrap(function (req, res) { res.json({ ok: true, scenarios: scenarios.list() }); }));
router.get('/scenarios/:id', wrap(function (req, res) { const s = scenarios.get(req.params.id); return s ? res.json({ ok:
true, scenario: { id: s.id, title: s.title, provider: s.provider, action: s.action } }) : res.status(404).json({ ok:
false, error: 'not_found' }); }));

// Run a scenario by id (body { scenarioId }) or a provider preview.
router.post('/run', wrap(function (req, res) {
  const body = req.body || {};

if (body.scenarioId) return res.json(Object.assign({ ok: true }, runner.runScenario(body.scenarioId)));
if (body.provider) return res.json(Object.assign({ ok: true }, runner.runProvider(body.provider, body.input || {})));
res.status(400).json({ ok: false, error: 'provide scenarioId or provider' });
}));

router.post('/run/:provider', wrap(function (req, res) { res.json(Object.assign({ ok: true },
runner.runProvider(req.params.provider, (req.body && req.body.input) || req.body || {}))); }));

router.post('/sanitize', wrap(function (req, res) { res.json(Object.assign({ ok: true }, sanitizer.sanitize((req.body &&
req.body.payload) != null ? req.body.payload : req.body))); }));

router.get('/events', wrap(function (req, res) { const limit = parseInt(req.query.limit, 10); res.json({ ok: true,
events: eventStore.list(Number.isFinite(limit) ? limit : 50), status: eventStore.status() }); }));

router.post('/report/generate', wrap(function (req, res) { res.json({ ok: true, dryRun: true, doctor: doctor.run(),
providers: registry.list(), scenarios: scenarios.list() }); }));

router.get('/doctor', wrap(function (req, res) { res.json(Object.assign({ ok: true }, doctor.run())); }));


module.exports = router;
