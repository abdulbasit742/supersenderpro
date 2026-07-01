// tests/smoke/aiSuiteSmoke.js
// Offline smoke test for the AI suite mounter + aggregator. No model needed.
// Verifies the registry shape, that mountAll() mounts installed routers onto a
// tiny fake app without throwing, and that aggregateHealth() returns a stable
// structure. Exit code 0 = pass.
//
// Run: node tests/smoke/aiSuiteSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable; health stays non-throwing

const assert = require('assert');
const suite = require('../../lib/aiSuite/aiSuite');

(async () => {
  let passed = 0;

  // registry shape
  assert.ok(Array.isArray(suite.REGISTRY) && suite.REGISTRY.length >= 20); passed++;
  assert.ok(suite.REGISTRY.every(f => f.id && f.label && f.path && f.router)); passed++;
  // paths are unique
  const paths = suite.REGISTRY.map(f => f.path);
  assert.strictEqual(new Set(paths).size, paths.length, 'mount paths must be unique'); passed++;
  // the capstone is registered
  assert.ok(suite.REGISTRY.find(f => f.id === 'inbound'), 'inbound pipeline should be registered'); passed++;

  // listFeatures returns a trimmed view
  const list = suite.listFeatures();
  assert.strictEqual(list.length, suite.REGISTRY.length); passed++;
  assert.ok(list.every(x => x.id && x.label && x.path && !x.router)); passed++;

  // mountAll onto a fake express-like app records every app.use call, never throws
  const calls = [];
  const fakeApp = { use: (p, r) => { calls.push({ p, r: typeof r }); } };
  const res = suite.mountAll(fakeApp);
  assert.ok(res && Array.isArray(res.mounted) && Array.isArray(res.skipped)); passed++;
  // mounted + skipped should account for the whole registry
  assert.strictEqual(res.mounted.length + res.skipped.length, suite.REGISTRY.length); passed++;
  // every mounted entry actually called app.use with that path
  for (const m of res.mounted) assert.ok(calls.find(c => c.p === m.path), `app.use called for ${m.path}`);
  passed++;

  // prefix option is respected
  const calls2 = [];
  suite.mountAll({ use: (p) => calls2.push(p) }, { prefix: '/v2' });
  if (res.mounted.length) assert.ok(calls2.some(p => p.startsWith('/v2/api/')), 'prefix should apply'); 
  passed++;

  // aggregateHealth returns a stable structure and never throws
  const health = await suite.aggregateHealth();
  assert.ok(typeof health.total === 'number' && Array.isArray(health.features)); passed++;
  assert.strictEqual(health.features.length, suite.REGISTRY.length); passed++;
  assert.ok(health.features.every(x => 'installed' in x && 'ok' in x && 'detail' in x)); passed++;
  assert.ok(typeof health.up === 'number' && typeof health.installed === 'number'); passed++;

  console.log(`\u2705 aiSuite smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c aiSuite smoke failed:', e); process.exit(1); });
