'use strict';
/**
 * tests/smoke/errorsSmoke.js - error factories, envelope, and 404 handler behavior.
 * Usage: node tests/smoke/errorsSmoke.js
 */
const assert = require('assert');
const { ApiError, errors, sendError, notFoundHandler } = require('../../lib/http/errors');

function fakeRes() { const o = { _c: 200, _j: null }; o.status = (c) => { o._c = c; return o; }; o.json = (j) => { o._j = j; return o; }; return o; }

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('factory builds typed ApiError', () => { const e = errors.notFound('nope'); assert.ok(e instanceof ApiError); assert.strictEqual(e.status, 404); assert.strictEqual(e.code, 'not_found'); });
t('sendError writes consistent envelope', () => { const res = fakeRes(); sendError(res, errors.forbidden('no'), { requestId: 'r1' }); assert.strictEqual(res._c, 403); assert.deepStrictEqual(res._j, { success: false, error: 'no', code: 'forbidden', requestId: 'r1' }); });
t('sendError defaults unknown to 500', () => { const res = fakeRes(); sendError(res, new Error('boom')); assert.strictEqual(res._c, 500); assert.strictEqual(res._j.code, 'internal_error'); });
t('notFoundHandler 404s unknown /api route', () => { const res = fakeRes(); let nexted = false; notFoundHandler()({ path: '/api/nope', method: 'GET' }, res, () => { nexted = true; }); assert.strictEqual(res._c, 404); assert.strictEqual(nexted, false); assert.strictEqual(res._j.code, 'not_found'); });
t('notFoundHandler ignores non-api paths', () => { const res = fakeRes(); let nexted = false; notFoundHandler()({ path: '/dashboard', method: 'GET' }, res, () => { nexted = true; }); assert.ok(nexted); assert.strictEqual(res._c, 200); });

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
