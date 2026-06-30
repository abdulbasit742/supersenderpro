'use strict';
/**
 * tests/smoke/webhookLogSmoke.js - record + list + replay (dry-run) + tenant isolation.
 * Usage: node tests/smoke/webhookLogSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const log = require('../../lib/webhooks/deliveryLog');

const A = 'whlog_A_' + Date.now();
const B = 'whlog_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  let id;
  await t('deliverAndLog (dry-run) records a delivery', async () => {
    const r = await log.deliverAndLog(A, 'https://example.com/hook', { event: 'order.paid' }, { secret: 's', dryRun: true });
    assert.ok(r.dryRun || r.ok !== undefined);
    const rows = await log.list(A, {});
    assert.ok(rows.length >= 1);
    id = rows[0].id;
    assert.strictEqual(rows[0].host, 'example.com');
  });
  await t('list filters by status', async () => { const rows = await log.list(A, { status: 'prepared' }); assert.ok(rows.every((r) => r.status === 'prepared')); });
  await t('replay re-sends + logs a new attempt', async () => { const before = (await log.list(A, {})).length; const r = await log.replay(A, id); assert.ok(r.replayedFrom === id); const after = (await log.list(A, {})).length; assert.ok(after > before); });
  await t('tenant isolation: B sees none of A', async () => { const rows = await log.list(B, {}); assert.strictEqual(rows.length, 0); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
