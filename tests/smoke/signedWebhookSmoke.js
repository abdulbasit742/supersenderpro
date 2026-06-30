'use strict';
/**
 * tests/smoke/signedWebhookSmoke.js - signature determinism + verify + dry-run delivery.
 * Usage: node tests/smoke/signedWebhookSmoke.js
 */
const assert = require('assert');
const { sign, verify, deliver } = require('../../lib/webhooks/signedDelivery');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('sign is deterministic for same ts', async () => {
    const a = sign({ hello: 'world' }, 'secret', 1000);
    const b = sign({ hello: 'world' }, 'secret', 1000);
    assert.strictEqual(a.header, b.header);
  });
  await t('verify accepts a valid signature', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const { header, body } = sign({ a: 1 }, 'shh', ts);
    assert.strictEqual(verify(body, header, 'shh'), true);
  });
  await t('verify rejects wrong secret', async () => {
    const { header, body } = sign({ a: 1 }, 'shh');
    assert.strictEqual(verify(body, header, 'wrong'), false);
  });
  await t('verify rejects stale timestamp', async () => {
    const { header, body } = sign({ a: 1 }, 'shh', Math.floor(Date.now() / 1000) - 10000);
    assert.strictEqual(verify(body, header, 'shh', 300), false);
  });
  await t('deliver dry-run returns signature without sending', async () => {
    const r = await deliver('https://example.com/hook', { event: 'test' }, { secret: 'shh', dryRun: true });
    assert.strictEqual(r.dryRun, true);
    assert.ok(r.signature.startsWith('t='));
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
