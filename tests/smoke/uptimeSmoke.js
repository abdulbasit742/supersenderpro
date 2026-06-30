'use strict';
/**
 * tests/smoke/uptimeSmoke.js - exercises the uptime monitor's record + summary (no timers).
 * Usage: node tests/smoke/uptimeSmoke.js
 */
const assert = require('assert');
const uptime = require('../../lib/observability/uptime');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('records samples and computes uptime%', () => {
  uptime.record('ok'); uptime.record('ok'); uptime.record('down'); uptime.record('ok');
  const s = uptime.summary();
  assert.ok(s.samples >= 4);
  assert.ok(s.uptimePct > 0 && s.uptimePct <= 100);
});
t('logs an incident on status transition', () => {
  uptime.record('ok'); uptime.record('down');
  const s = uptime.summary();
  assert.ok(Array.isArray(s.incidents));
  assert.ok(s.incidents.length >= 1);
});
t('current status reflects last sample', () => {
  uptime.record('degraded');
  assert.strictEqual(uptime.summary().currentStatus, 'degraded');
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
