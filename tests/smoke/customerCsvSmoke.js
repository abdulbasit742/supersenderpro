'use strict';
/**
 * tests/smoke/customerCsvSmoke.js - parse, import (create+update+errors), export round-trip, isolation.
 * Usage: node tests/smoke/customerCsvSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const csv = require('../../lib/customers/csv');

const A = 'csv_A_' + Date.now();
const B = 'csv_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('parse handles quoted commas', () => {
    const rows = csv.parseCSV('phone,name\n111,"Khan, Ayesha"\n222,Bilal');
    assert.strictEqual(rows.length, 3);
    assert.strictEqual(rows[1][1], 'Khan, Ayesha');
    return Promise.resolve();
  });
  await t('import creates rows + flags missing phone', async () => {
    const r = await csv.importCustomers(A, 'phone,name,tier\n111,Ayesha,Gold\n,NoPhone,Bronze\n222,Bilal,Silver');
    assert.strictEqual(r.created, 2);
    assert.strictEqual(r.errors.length, 1);
    assert.strictEqual(r.errors[0].error, 'missing phone');
  });
  await t('re-import updates (upsert by phone)', async () => {
    const r = await csv.importCustomers(A, 'phone,name,tier\n111,Ayesha Khan,VIP');
    assert.strictEqual(r.updated, 1);
    assert.strictEqual(r.created, 0);
  });
  await t('export returns header + rows', async () => {
    const out = await csv.exportCustomers(A);
    assert.ok(out.startsWith('phone,name,city,tier,tags,status,promoOptIn'));
    assert.ok(out.includes('Ayesha Khan'));
  });
  await t('tenant isolation: B export empty', async () => {
    const out = await csv.exportCustomers(B);
    assert.strictEqual(out.trim(), csv.COLUMNS.join(','));
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
