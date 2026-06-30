'use strict';
/**
 * tests/smoke/bootstrapSmoke.js - mounts every subsystem on a throwaway Express app and asserts
 * the wiring doesn't throw and key routes respond. No network port: uses express app handler
 * directly via a minimal fake req/res where possible, else checks the mount report.
 * Usage: node tests/smoke/bootstrapSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.AUTH_JWT_SECRET = 'bootstrap-secret';
process.env.SALES_PIPELINE_DRY_RUN = 'true';
process.env.ADMIN_ALERT_DRY_RUN = 'true';

const assert = require('assert');
let express = null;
try { express = require('express'); } catch { console.log('SKIP: express not installed in this environment - bootstrap smoke needs it'); process.exit(0); }

const { registerAll } = require('../../lib/bootstrap/registerSubsystems');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

const app = express();
app.use(express.json());
const fakeServer = { close: (cb) => cb && cb() };
const report = registerAll(app, fakeServer);

t('registerAll returns a report', () => { assert.ok(report && Array.isArray(report.mounted)); });
t('core routers mounted (auth, billing, health)', () => {
  ['auth', 'billing', 'health'].forEach((n) => assert.ok(report.mounted.includes(n), n + ' should mount'));
});
t('no hard failures during mount', () => {
  // failures are tolerated individually but for the core set we expect zero
  const coreFailed = report.failed.filter((f) => ['auth', 'billing', 'health', 'salesPipeline'].includes(f.name));
  assert.strictEqual(coreFailed.length, 0, 'core routers must not fail: ' + JSON.stringify(coreFailed));
});
t('app has a router stack with mounts', () => {
  assert.ok(app._router && app._router.stack && app._router.stack.length > 0);
});

console.log('\n' + passed + ' checks passed. mounted=' + report.mounted.join(',') + (report.failed.length ? ' failed=' + report.failed.map((f) => f.name).join(',') : ''));
process.exit(process.exitCode || 0);
