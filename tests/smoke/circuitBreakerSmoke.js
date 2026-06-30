'use strict';
/**
 * tests/smoke/circuitBreakerSmoke.js - open after threshold, fail fast, half-open recovery.
 * Usage: node tests/smoke/circuitBreakerSmoke.js
 */
process.env.CB_FAILURE_THRESHOLD = '3';
process.env.CB_COOLDOWN_MS = '50';
const assert = require('assert');
const cb = require('../../lib/stability/circuitBreaker');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });
const failing = async () => { throw new Error('downstream down'); };
const okFn = async () => 'ok';

(async () => {
  const KEY = 'cbtest_' + Date.now();
  await t('opens after threshold failures', async () => {
    for (let i = 0; i < 3; i++) { try { await cb.wrap(KEY, failing); } catch {} }
    assert.strictEqual(cb.getState(KEY).state, 'open');
  });
  await t('fails fast while open (CIRCUIT_OPEN)', async () => {
    let code = null; try { await cb.wrap(KEY, okFn); } catch (e) { code = e.code; }
    assert.strictEqual(code, 'CIRCUIT_OPEN');
  });
  await t('half-opens after cooldown, success closes it', async () => {
    await new Promise((r) => setTimeout(r, 70));
    const r = await cb.wrap(KEY, okFn);
    assert.strictEqual(r, 'ok');
    assert.strictEqual(cb.getState(KEY).state, 'closed');
  });
  await t('snapshot reports states', async () => {
    const snap = cb.snapshot();
    assert.ok(KEY in snap);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
