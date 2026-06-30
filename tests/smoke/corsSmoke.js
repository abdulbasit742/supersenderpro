'use strict';
/**
 * tests/smoke/corsSmoke.js - allowlist + preflight behavior. Sets env BEFORE require.
 * Usage: node tests/smoke/corsSmoke.js
 */
process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com';
process.env.CORS_CREDENTIALS = 'true';
const assert = require('assert');
const { cors, isAllowed } = require('../../lib/security/cors');

function fakeRes() { const h = {}; return { _h: h, _code: 200, set: (k, v) => { h[k] = v; }, status(c) { this._code = c; return this; }, end() { this._ended = true; return this; } }; }
function run(req) { return new Promise((resolve) => { const res = fakeRes(); cors()(req, res, () => { res._next = true; resolve(res); }); setTimeout(() => resolve(res), 10); }); }

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('allowed origin gets reflected header', async () => {
    const res = await run({ method: 'GET', get: (k) => (k.toLowerCase() === 'origin' ? 'https://app.example.com' : undefined) });
    assert.strictEqual(res._h['Access-Control-Allow-Origin'], 'https://app.example.com');
    assert.strictEqual(res._h['Access-Control-Allow-Credentials'], 'true');
    assert.ok(res._next);
  });
  await t('disallowed origin gets no allow-origin header', async () => {
    const res = await run({ method: 'GET', get: (k) => (k.toLowerCase() === 'origin' ? 'https://evil.com' : undefined) });
    assert.ok(!res._h['Access-Control-Allow-Origin']);
  });
  await t('preflight from allowed origin -> 204', async () => {
    const res = await run({ method: 'OPTIONS', get: (k) => (k.toLowerCase() === 'origin' ? 'https://admin.example.com' : undefined) });
    assert.strictEqual(res._code, 204);
  });
  await t('preflight from disallowed origin -> 403', async () => {
    const res = await run({ method: 'OPTIONS', get: (k) => (k.toLowerCase() === 'origin' ? 'https://evil.com' : undefined) });
    assert.strictEqual(res._code, 403);
  });
  await t('isAllowed allows listed, rejects others', async () => {
    assert.strictEqual(isAllowed('https://app.example.com'), true);
    assert.strictEqual(isAllowed('https://nope.com'), false);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
