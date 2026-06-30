'use strict';
/**
 * tests/smoke/openapiSmoke.js - the OpenAPI doc is well-formed and covers core paths.
 * Usage: node tests/smoke/openapiSmoke.js
 */
const assert = require('assert');
const { build } = require('../../lib/apiDocs/openapi');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

const doc = build();
t('is OpenAPI 3.x', () => { assert.ok(String(doc.openapi).startsWith('3.')); });
t('has info + servers', () => { assert.ok(doc.info && doc.info.title); assert.ok(Array.isArray(doc.servers)); });
t('declares security schemes (bearer + apiKey)', () => { assert.ok(doc.components.securitySchemes.bearerAuth); assert.ok(doc.components.securitySchemes.apiKey); });
t('covers core paths', () => {
  ['/api/auth/login', '/api/billing/plans', '/api/sales-pipeline/deals', '/api/health', '/metrics'].forEach((p) => assert.ok(doc.paths[p], 'missing ' + p));
});
t('serializes to valid JSON', () => { const s = JSON.stringify(doc); assert.ok(s.length > 500); JSON.parse(s); });

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
