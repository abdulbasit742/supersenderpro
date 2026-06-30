'use strict';
/**
 * tests/smoke/observabilitySmoke.js - dependency-light checks for logging + error capture.
 * Usage: node tests/smoke/observabilitySmoke.js
 */
const assert = require('assert');
const { logger, errorTracker } = require('../../lib/observability');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('logger has standard levels', () => { ['info', 'warn', 'error', 'child'].forEach((m) => assert.strictEqual(typeof logger[m], 'function')); });
t('child logger binds without throwing', () => { const c = logger.child({ requestId: 'test', tenantId: 't1' }); c.info({ msg: 'hello' }); });
t('errorTracker.capture buffers + returns entry', () => { const e = errorTracker.capture(new Error('boom'), { path: '/x' }); assert.strictEqual(e.message, 'boom'); assert.ok(errorTracker.recent(1).length === 1); });
t('stats reports buffer + sentry flag', () => { const s = errorTracker.stats(); assert.ok(typeof s.buffered === 'number'); assert.ok(typeof s.sentry === 'boolean'); });

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
