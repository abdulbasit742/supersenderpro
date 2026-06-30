'use strict';
/**
 * tests/smoke/metricsSmoke.js - counter/gauge/histogram + exposition format. Usage: node tests/smoke/metricsSmoke.js
 */
const assert = require('assert');
const metrics = require('../../lib/observability/metrics');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

metrics.reset();

t('counter increments with labels', () => {
  metrics.inc('http_requests_total', { method: 'GET', route: '/x', status: '200' });
  metrics.inc('http_requests_total', { method: 'GET', route: '/x', status: '200' });
  const out = metrics.render();
  assert.ok(/http_requests_total\{[^}]*\} 2/.test(out));
});
t('gauge sets value', () => {
  metrics.setGauge('process_uptime_seconds', 42);
  assert.ok(metrics.render().includes('process_uptime_seconds 42'));
});
t('histogram emits buckets + sum + count', () => {
  metrics.observe('http_request_duration_seconds', 0.03, { route: '/y' });
  const out = metrics.render();
  assert.ok(out.includes('http_request_duration_seconds_sum'));
  assert.ok(out.includes('http_request_duration_seconds_count'));
  assert.ok(out.includes('le="+Inf"'));
});
t('exposition ends with newline', () => { assert.ok(metrics.render().endsWith('\n')); });

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
