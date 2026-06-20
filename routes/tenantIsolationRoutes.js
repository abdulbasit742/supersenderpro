// routes/tenantIsolationRoutes.js — Express router for the Multi-Tenant Data Isolation + Workspace Boundary + Leak Detection Command Center.
// Mounted at /api/tenant-isolation. Dry-run safe. No raw private data, no secrets/full PII in responses. No destructive actions. No external calls.
const express = require('express');
const router = express.Router();
const TI = require('../lib/tenantIsolation');
const { config } = require('../lib/tenantIsolation/config');

function safe(fn) { return async (req, res) => { try { const o = await fn(req, res); if (o !== undefined && !res.headersSent) res.json(o); } catch (e) { res.status(500).json({ ok: false, error: 'tenant_isolation_error' }); } }; }
TI.policyRegistry.seedDefaults();

router.get('/status', safe(() => ({ ok: true, enabled: config.enabled, dryRun: config.dryRun, posture: TI.privacyGuard.posture(), policyCount: TI.policyRegistry.list().length })));

// Policies
router.get('/policies', safe(() => ({ ok: true, policies: TI.policyRegistry.list() })));
router.post('/policies', safe((req) => ({ ok: true, policy: TI.policyRegistry.create(req.body || {}) })));
router.get('/policies/:id', safe((req) => { const p = TI.policyRegistry.get(req.params.id); return p ? { ok: true, policy: p } : { ok: false, error: 'not_found' }; }));
router.put('/policies/:id', safe((req) => { const p = TI.policyRegistry.update(req.params.id, req.body || {}); return p ? { ok: true, policy: p } : { ok: false, error: 'not_found' }; }));

// Evaluation
router.post('/evaluate', safe((req) => ({ ok: true, decision: TI.isolationEvaluator.decide(req.body || {}) })));
router.post('/check/tenant', safe((req) => ({ ok: true, decision: TI.isolationEvaluator.decide({ ...(req.body || {}), boundaryType: 'tenant' }) })));
router.post('/check/reseller', safe((req) => ({ ok: true, decision: TI.isolationEvaluator.decide({ ...(req.body || {}), actorType: 'reseller', boundaryType: 'reseller' }) })));
router.post('/check/workspace', safe((req) => ({ ok: true, decision: TI.isolationEvaluator.decide({ ...(req.body || {}), boundaryType: 'workspace' }) })));
router.post('/check/developer-scope', safe((req) => ({ ok: true, decision: TI.isolationEvaluator.decide({ ...(req.body || {}), actorType: 'developer_app', boundaryType: 'developer_api' }) })));
router.post('/check/public-response', safe((req) => ({ ok: true, result: TI.leakDetector.detect((req.body || {}).payload || {}, { route: 'public-response' }) })));

// Leak detection
router.post('/leak-detect', safe((req) => ({ ok: true, result: TI.leakDetector.detect((req.body || {}).payload || (req.body || {}), { route: (req.body || {}).route }) })));
router.post('/scan/payload', safe((req) => ({ ok: true, result: TI.payloadScanner.scan((req.body || {}).payload || (req.body || {}), req.body || {}) })));
router.get('/leaks', safe((req) => ({ ok: true, leaks: TI.leakDetector.listLeaks(Number(req.query.limit) || 100) })));

// Scanners
router.post('/scan/routes', safe(() => ({ ok: true, result: TI.routeBoundaryScanner.scan() })));
router.post('/scan/stores', safe(() => ({ ok: true, result: TI.storeBoundaryScanner.scan() })));
router.get('/scan/summary', safe(() => ({ ok: true, routes: TI.routeBoundaryScanner.scan().summary, stores: (() => { const s = TI.storeBoundaryScanner.scan(); return { storesScanned: s.storesScanned, piiFields: s.piiFieldsFound.length, tenantFields: s.tenantFieldsFound.length }; })() })));

// Simulation
router.get('/simulations', safe(() => ({ ok: true, simulations: TI.crossTenantSimulation.list() })));
router.post('/simulations/run', safe(() => ({ ok: true, result: TI.crossTenantSimulation.run() })));

// Reports
router.get('/dashboard', safe(() => {
  const sim = TI.crossTenantSimulation.run();
  const routes = TI.routeBoundaryScanner.scan().summary;
  const doctor = TI.isolationDoctor.run();
  return { ok: true, posture: TI.privacyGuard.posture(), score: doctor.score, doctorStatus: doctor.status, policyCount: TI.policyRegistry.list().length, simulations: { passed: sim.passed, failed: sim.failed, total: sim.total }, routeRisks: routes, recentLeaks: TI.leakDetector.listLeaks(10) };
}));
router.get('/doctor', safe(() => ({ ok: true, doctor: TI.isolationDoctor.run() })));
router.post('/report/generate', safe(() => { const d = TI.isolationDoctor.run(); const guard = TI.safetyGuard.guardRawExport(false); return { ok: true, report: { generatedAt: new Date().toISOString(), score: d.score, status: d.status, posture: TI.privacyGuard.posture(), policies: TI.policyRegistry.list().length, rawExport: guard, dryRun: config.dryRun } }; }));

module.exports = router;
