'use strict';
/**
 * tests/smoke/lifecycleSmoke.js - verifies readiness gating + closer registration without
 * actually killing the process (we don't send real signals here).
 * Usage: node tests/smoke/lifecycleSmoke.js
 */
const assert = require('assert');
const lifecycle = require('../../lib/lifecycle');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('isReady true before shutdown', () => { assert.strictEqual(lifecycle.isReady(), true); });
t('onShutdown accepts (name, fn)', () => { let ok = true; try { lifecycle.onShutdown('test', () => {}); } catch { ok = false; } assert.ok(ok); });
t('onShutdown accepts (fn)', () => { let ok = true; try { lifecycle.onShutdown(() => {}); } catch { ok = false; } assert.ok(ok); });
t('install returns helpers with a fake server', () => {
  const fake = { close: (cb) => cb && cb() };
  const api = lifecycle.install(fake);
  assert.strictEqual(typeof api.isReady, 'function');
  assert.strictEqual(typeof api.onShutdown, 'function');
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
