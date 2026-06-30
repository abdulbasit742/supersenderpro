'use strict';
/**
 * tests/smoke/schedulerSmoke.js - register/run/status + error isolation. Usage: node tests/smoke/schedulerSmoke.js
 */
const assert = require('assert');
const scheduler = require('../../lib/scheduler');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('register + manual run increments runs', async () => {
    let ran = 0;
    const job = scheduler.register('test-job', { intervalMs: 999999, fn: async () => { ran++; } });
    await scheduler._run(job);
    assert.strictEqual(ran, 1);
    assert.strictEqual(job.runs, 1);
    assert.ok(job.lastRun);
  });
  await t('throwing job is isolated + recorded', async () => {
    const job = scheduler.register('bad-job', { intervalMs: 999999, fn: async () => { throw new Error('boom'); } });
    await scheduler._run(job); // must not throw
    assert.strictEqual(job.lastError, 'boom');
  });
  await t('status lists jobs', async () => {
    const s = scheduler.status();
    assert.ok(s.jobs.some((j) => j.name === 'test-job'));
    assert.ok(s.jobs.some((j) => j.name === 'bad-job'));
  });
  await t('register requires a fn', async () => {
    let threw = false; try { scheduler.register('nofn', { intervalMs: 1 }); } catch { threw = true; }
    assert.ok(threw);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
