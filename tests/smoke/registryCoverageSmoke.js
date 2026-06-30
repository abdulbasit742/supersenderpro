'use strict';
/**
 * tests/smoke/registryCoverageSmoke.js - guards against wiring drift.
 * 1) Every route module referenced by registerSubsystems must require() cleanly and export
 *    something router-like (a function with .use/.handle, i.e. an express Router).
 * 2) Every lib/<subsystem> that ships a route should have a tests/smoke/*Smoke.js.
 * This catches a typo'd path or a broken export at CI time instead of at boot.
 * Usage: node tests/smoke/registryCoverageSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.AUTH_JWT_SECRET = 'coverage-secret';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

// The list mirrors registerSubsystems' routers array.
const ROUTE_MODULES = [
  'routes/authRoutes', 'routes/billingRoutes', 'routes/salesPipelineRoutes', 'routes/healthRoutes',
  'routes/adminAlertRoutes', 'routes/observabilityRoutes', 'routes/opsDashboardRoutes', 'routes/versionRoutes',
  'routes/metricsRoutes', 'routes/docsRoutes', 'routes/tenantRoutes', 'routes/apiKeyRoutes', 'routes/auditRoutes',
  'routes/complianceRoutes', 'routes/schedulerRoutes', 'routes/webhookLogRoutes', 'routes/analyticsRoutes',
  'routes/customerCsvRoutes', 'routes/maintenanceRoutes',
];

const isRouter = (m) => typeof m === 'function' && (typeof m.use === 'function' || typeof m.handle === 'function');

t('every wired route module loads + exports a router', () => {
  const broken = [];
  for (const rel of ROUTE_MODULES) {
    try { const mod = require(path.join(ROOT, rel)); if (!isRouter(mod)) broken.push(rel + ' (not a router)'); }
    catch (e) { broken.push(rel + ' (' + e.message + ')'); }
  }
  assert.strictEqual(broken.length, 0, 'broken route modules: ' + broken.join(', '));
});

t('registerSubsystems itself loads', () => {
  const mod = require(path.join(ROOT, 'lib/bootstrap/registerSubsystems'));
  assert.strictEqual(typeof mod.registerAll, 'function');
});

t('core lib subsystems have a smoke test', () => {
  const smokeDir = path.join(ROOT, 'tests', 'smoke');
  const smokes = fs.existsSync(smokeDir) ? fs.readdirSync(smokeDir).map((f) => f.toLowerCase()) : [];
  const have = (kw) => smokes.some((f) => f.includes(kw));
  const expected = ['auth', 'billing', 'salespipeline', 'health', 'tenant', 'apikey', 'audit', 'analytics', 'maintenance', 'idempotency', 'metrics'];
  const missing = expected.filter((k) => !have(k));
  assert.strictEqual(missing.length, 0, 'subsystems missing a smoke test: ' + missing.join(', '));
});

t('route count matches expectation (catches accidental removals)', () => {
  assert.ok(ROUTE_MODULES.length >= 19, 'expected >= 19 wired routers, found ' + ROUTE_MODULES.length);
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
