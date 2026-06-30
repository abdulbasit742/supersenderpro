'use strict';
/**
 * tests/smoke/timeoutSmoke.js - timeout fires 503 on slow handler, passes fast ones, skips streams.
 * Usage: node tests/smoke/timeoutSmoke.js
 */
const assert = require('assert');
const { requestTimeout, slowRequestLog } = require('../../lib/http/timeout');

function fakeRes() {
  const listeners = {};
  return { _code: 200, _json: null, headersSent: false, set: () => {}, on(ev, fn) { listeners[ev] = fn; }, emit(ev) { if (listeners[ev]) listeners[ev](); }, status(c) { this._code = c; return this; }, json(o) { this._json = o; this.headersSent = true; return this; } };
}

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('slow handler gets 503 after budget', async () => {
    const res = fakeRes();
    requestTimeout(30)({ path: '/api/slow' }, res, () => {});
    await new Promise((r) => setTimeout(r, 60));
    assert.strictEqual(res._code, 503);
    assert.ok(res._json && /timed out/.test(res._json.error));
  });
  await t('fast handler is not timed out', async () => {
    const res = fakeRes();
    requestTimeout(50)({ path: '/api/fast' }, res, () => {});
    res.json({ ok: true }); res.emit('finish');
    await new Promise((r) => setTimeout(r, 70));
    assert.strictEqual(res._code, 200);
  });
  await t('streaming paths are skipped', async () => {
    const res = fakeRes();
    let nexted = false;
    requestTimeout(10)({ path: '/api/ops/sse' }, res, () => { nexted = true; });
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(nexted);
    assert.strictEqual(res._code, 200); // never set to 503
  });
  await t('slowRequestLog passes through', async () => {
    const res = fakeRes();
    let nexted = false;
    slowRequestLog(5)({ path: '/x', method: 'GET' }, res, () => { nexted = true; });
    assert.ok(nexted);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
