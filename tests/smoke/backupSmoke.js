'use strict';
/**
 * tests/smoke/backupSmoke.js - snapshot captures store, restore (dry-run) plans correctly.
 * Writes through lib/db (json) then snapshots. Usage: node tests/smoke/backupSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const repo = require('../../lib/db');
const { createSnapshot, listSnapshots, restoreSnapshot } = require('../../lib/backup/snapshot');

const T = 'backup_tenant_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  let snapFile;
  await t('seed data then snapshot captures rows', async () => {
    await repo.create(T, 'customers', { phone: '111', name: 'Snap' });
    await repo.create(T, 'deals', { title: 'D' });
    const r = createSnapshot('test');
    assert.ok(r.rows >= 2);
    snapFile = r.file;
  });
  await t('listSnapshots includes the new file', async () => {
    const list = listSnapshots();
    assert.ok(list.some((s) => s.file === snapFile));
  });
  await t('restore dry-run produces a plan without writing', async () => {
    const plan = restoreSnapshot(snapFile, { dryRun: true });
    assert.strictEqual(plan.dryRun, true);
    assert.ok(plan.restore.length >= 1);
    assert.strictEqual(plan.restoredAt, null);
  });
  await t('invalid snapshot path throws', async () => {
    let threw = false; try { restoreSnapshot('backups/nope.json', { dryRun: true }); } catch { threw = true; }
    assert.ok(threw);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
