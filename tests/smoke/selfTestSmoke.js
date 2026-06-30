// tests/smoke/selfTestSmoke.js
// Offline smoke test for the self-test runner itself (meta, but cheap). Verifies
// discovery finds smoke files and that running a tiny filter completes with a
// structured result. Uses a narrow filter so it doesn\'t recursively run the
// whole set. Exit code 0 = pass.
//
// Run: node tests/smoke/selfTestSmoke.js

const assert = require('assert');
const selfTest = require('../../lib/aiSuite/selfTest');

(async () => {
  let passed = 0;

  // discovery finds *Smoke.js files (this file included)
  const all = selfTest.discover();
  assert.ok(Array.isArray(all) && all.length >= 1); passed++;
  assert.ok(all.every(f => /Smoke\.js$/.test(f))); passed++;

  // filter narrows the set
  const filtered = selfTest.discover('guardrails');
  assert.ok(filtered.every(f => f.toLowerCase().includes('guardrails'))); passed++;

  // run a single, known-fast, model-free suite (guardrails) and check structure
  const r = await selfTest.run({ filter: 'guardrails', timeoutMs: 30000, concurrency: 1 });
  assert.ok(typeof r.total === 'number' && r.total >= 1, 'should run at least one suite'); passed++;
  assert.ok(Array.isArray(r.results) && r.results.every(x => 'ok' in x && 'file' in x)); passed++;
  assert.ok('passed' in r && 'failed' in r && 'totalChecks' in r); passed++;
  // guardrails smoke is deterministic + offline, so it should pass
  assert.strictEqual(r.ok, true, 'guardrails smoke should pass offline'); passed++;

  console.log(`\u2705 selfTest smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c selfTest smoke failed:', e); process.exit(1); });
