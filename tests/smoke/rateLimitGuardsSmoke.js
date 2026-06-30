'use strict';
/**
 * tests/smoke/rateLimitGuardsSmoke.js - verifies guard presets block after the cap (memory mode).
 * Uses tiny fake req/res objects, no server. Usage: node tests/smoke/rateLimitGuardsSmoke.js
 */
const assert = require('assert');
process.env.RL_AUTH_LIMIT = '3';
process.env.RL_AUTH_WINDOW = '60';
const guards = require('../../lib/security/guards');

function fakeReq(ip) { return { ip, headers: {}, }; }
function fakeRes() { const h = {}; return { statusCode: 200, body: null, set: (k, v) => { h[k] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { this.body = o; return this; }, _headers: h }; }
function run(guard, req) { return new Promise((resolve) => { const res = fakeRes(); guard(req, res, () => { res._next = true; resolve(res); }); setTimeout(() => resolve(res), 20); }); }

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('authGuard allows under cap then blocks', async () => {
    const ip = '203.0.113.' + Math.floor(Math.random() * 250);
    let lastRes;
    for (let i = 0; i < 3; i++) { lastRes = await run(guards.authGuard, fakeReq(ip)); }
    assert.ok(lastRes._next, '3rd request (cap=3) should pass');
    const blocked = await run(guards.authGuard, fakeReq(ip));
    assert.strictEqual(blocked.statusCode, 429, '4th must be 429');
    assert.strictEqual(blocked.body && blocked.body.scope, 'auth');
  });
  await t('different IPs have separate budgets', async () => {
    const a = await run(guards.authGuard, fakeReq('198.51.100.1'));
    const b = await run(guards.authGuard, fakeReq('198.51.100.2'));
    assert.ok(a._next && b._next, 'fresh IPs should each pass');
  });
  await t('apiGuard sets rate-limit headers', async () => {
    const res = await run(guards.apiGuard, fakeReq('198.51.100.9'));
    assert.ok(res._headers['X-RateLimit-Limit']);
    assert.ok(res._headers['X-RateLimit-Remaining'] !== undefined);
  });
  console.log('\n' + passed + ' checks passed.');
})();
