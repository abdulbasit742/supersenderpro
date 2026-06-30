'use strict';
/**
 * tests/smoke/securityHeadersSmoke.js - verifies headers middleware sets the expected headers
 * and bodySizeGuard rejects oversized payloads. Fake req/res, no server. Usage: node tests/smoke/securityHeadersSmoke.js
 */
const assert = require('assert');
const { securityHeaders, bodySizeGuard } = require('../../lib/security/headers');

function fakeRes() { const h = {}; return { _h: h, set: (k, v) => { h[k] = v; }, removeHeader: () => {}, status(c) { this._c = c; return this; }, json(o) { this._j = o; return this; } }; }

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('sets core security headers', () => {
  const res = fakeRes(); let nexted = false;
  securityHeaders()({ headers: {} }, res, () => { nexted = true; });
  assert.ok(nexted);
  assert.strictEqual(res._h['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(res._h['X-Frame-Options'], 'DENY');
  assert.ok(res._h['Referrer-Policy']);
  assert.ok(res._h['Content-Security-Policy']);
  assert.ok(res._h['Strict-Transport-Security']);
});
t('bodySizeGuard allows small bodies', () => {
  const res = fakeRes(); let nexted = false;
  bodySizeGuard(1000)({ headers: { 'content-length': '500' } }, res, () => { nexted = true; });
  assert.ok(nexted);
});
t('bodySizeGuard rejects oversized bodies with 413', () => {
  const res = fakeRes(); let nexted = false;
  bodySizeGuard(1000)({ headers: { 'content-length': '5000' } }, res, () => { nexted = true; });
  assert.strictEqual(nexted, false);
  assert.strictEqual(res._c, 413);
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
