// routes/securityGatewayRoutes.js — Express router for the Security Gateway + Rate Limit + Abuse Protection Command Center.
// Mounted at /api/security-gateway. Dry-run / report-only by default. No raw IP/PII/secrets in responses. No external calls. No live blocking unless SECURITY_GATEWAY_ENFORCE=true.
const express = require('express');
const router = express.Router();
const SG = require('../lib/securityGateway');
const { config } = require('../lib/securityGateway/config');

function safe(fn) { return async (req, res) => { try { const o = await fn(req, res); if (o !== undefined && !res.headersSent) res.json(o); } catch (e) { res.status(500).json({ ok: false, error: 'security_gateway_error' }); } }; }

// Ensure default policies exist on first touch.
SG.securityPolicy.seedDefaults();

// --- Status / policies ---
router.get('/status', safe(() => ({ ok: true, status: SG.securityGateway.status() })));
router.get('/policies', safe(() => ({ ok: true, policies: SG.securityPolicy.list() })));
router.post('/policies', safe((req) => ({ ok: true, policy: SG.securityPolicy.create(req.body || {}) })));
router.get('/policies/:id', safe((req) => { const p = SG.securityPolicy.get(req.params.id); return p ? { ok: true, policy: p } : { ok: false, error: 'not_found' }; }));
router.put('/policies/:id', safe((req) => { const p = SG.securityPolicy.update(req.params.id, req.body || {}); return p ? { ok: true, policy: p } : { ok: false, error: 'not_found' }; }));

// --- Rate limits ---
router.get('/rate-limits', safe(() => ({ ok: true, defaults: SG.rateLimitPolicy.defaults(), enforce: config.enforce })));
router.post('/rate-limits/test', safe((req) => ({ ok: true, result: SG.rateLimiter.check({ ...(req.body || {}), ip: (req.body || {}).ip || req.ip, userAgent: req.headers['user-agent'] }) })));
router.post('/rate-limits/reset-preview', safe((req) => ({ ok: true, result: SG.rateLimiter.resetPreview({ ...(req.body || {}), ip: (req.body || {}).ip || req.ip }) })));

// --- Abuse ---
router.get('/abuse/signals', safe(() => ({ ok: true, recent: SG.suspiciousActivity.list(50) })));
router.post('/abuse/check', safe((req) => ({ ok: true, result: SG.abuseDetector.check({ ...(req.body || {}), ip: (req.body || {}).ip || req.ip, userAgent: req.headers['user-agent'] }) })));
router.post('/abuse/sample-run', safe(() => ({ ok: true, result: SG.abuseDetector.check({ scope: 'public_form', repeatCount: 20, consent: false, payload: { note: '../etc/passwd' } }) })));

// --- Validation (preview only) ---
router.post('/validate/public-form', safe((req) => ({ ok: true, result: SG.inputValidator.validatePublicForm(req.body || {}, (req.body || {}).options || {}) })));
router.post('/validate/developer-api', safe((req) => ({ ok: true, result: SG.scopeGuard.check(req.body || {}) })));
router.post('/validate/webhook', safe((req) => ({ ok: true, result: SG.inputValidator.validateGeneric((req.body || {}).payload || {}, { flagPii: true }) })));
router.post('/validate/tenant-access', safe((req) => ({ ok: true, result: SG.tenantIsolationGuard.check(req.body || {}) })));

// --- Events ---
router.get('/events', safe((req) => ({ ok: true, events: SG.securityEventWriter.list(Number(req.query.limit) || 100) })));
router.get('/events/:id', safe((req) => { const e = SG.securityEventWriter.get(req.params.id); return e ? { ok: true, event: e } : { ok: false, error: 'not_found' }; }));
router.post('/events/export-redacted', safe(() => {
  const guard = SG.safetyGuard.guardRawExport(false);
  return { ok: true, exportType: 'redacted', rawExport: guard, events: SG.securityEventWriter.list(500) };
}));

// --- Reports ---
router.get('/dashboard', safe(() => {
  const events = SG.securityEventWriter.list(200);
  const byRisk = events.reduce((a, e) => { a[e.riskLevel] = (a[e.riskLevel] || 0) + 1; return a; }, {});
  const doctor = SG.securityDoctor.run();
  return { ok: true, status: SG.securityGateway.status(), posture: SG.privacyGuard.posture(), score: doctor.score, doctorStatus: doctor.status, eventsByRisk: byRisk, rateLimits: SG.rateLimitPolicy.defaults(), recentEvents: events.slice(0, 20) };
}));
router.get('/doctor', safe(() => ({ ok: true, doctor: SG.securityDoctor.run() })));
router.post('/report/generate', safe(() => { const d = SG.securityDoctor.run(); return { ok: true, report: { generatedAt: new Date().toISOString(), score: d.score, status: d.status, posture: SG.privacyGuard.posture(), policies: SG.securityPolicy.list().length, events: SG.securityEventWriter.list(1000).length, dryRun: config.enforce !== true } }; }));

module.exports = router;
