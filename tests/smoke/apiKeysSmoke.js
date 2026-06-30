'use strict';
/**
 * tests/smoke/apiKeysSmoke.js - issue/verify/revoke + tenant resolution. Usage: node tests/smoke/apiKeysSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const apiKeys = require('../../lib/apiKeys');

const T = 'apikey_tenant_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  let raw, keyId;
  await t('issue returns a raw key once', async () => { const k = await apiKeys.issue(T, { name: 'ci', scopes: ['send'] }); assert.ok(k.key && k.key.startsWith('sk_')); raw = k.key; keyId = k.id; });
  await t('verify resolves tenant + scopes', async () => { const v = await apiKeys.verify(raw); assert.ok(v); assert.strictEqual(v.tenantId, T); assert.ok(v.scopes.includes('send')); });
  await t('list never exposes the raw key/hash', async () => { const ks = await apiKeys.list(T); assert.ok(ks.length >= 1); assert.ok(!('key' in ks[0]) && !('keyHash' in ks[0])); assert.ok(ks[0].prefix.startsWith('sk_')); });
  await t('invalid key returns null', async () => { const v = await apiKeys.verify('sk_doesnotexist'); assert.strictEqual(v, null); });
  await t('revoke makes verify fail', async () => { await apiKeys.revoke(T, keyId); const v = await apiKeys.verify(raw); assert.strictEqual(v, null); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
