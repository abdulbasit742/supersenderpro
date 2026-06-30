// tests/smoke/llmOpsSmoke.js
// Offline smoke test for LLM ops. Points OLLAMA_HOST at an unreachable address;
// status reports down, keepWarm fails gracefully, metrics math is exercised via
// record(). Exit code 0 = pass.
//
// Run: node tests/smoke/llmOpsSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable

const assert = require('assert');
const ops = require('../../lib/llmOps/llmOps');
const { percentile, estimateTokens } = ops._internal;

(async () => {
  let passed = 0;

  // percentile helper
  assert.strictEqual(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50), 6); passed++;
  assert.strictEqual(percentile([], 50), null); passed++;
  assert.ok(estimateTokens('abcd') >= 1); passed++;

  // status: unreachable reported cleanly (no throw)
  const s = await ops.status();
  assert.strictEqual(s.reachable, false); passed++;
  assert.ok(Array.isArray(s.loadedModels)); passed++;

  // keepWarm fails gracefully
  const w = await ops.keepWarm();
  assert.strictEqual(w.warmed, false); passed++;

  // record some metrics + roll them up
  ops.record({ provider: 'ollama', latencyMs: 100, tokens: 50, success: true });
  ops.record({ provider: 'ollama', latencyMs: 300, tokens: 80, success: true });
  ops.record({ provider: 'groq', latencyMs: 500, tokens: 60, success: true, fellBack: true });
  ops.record({ provider: 'ollama', latencyMs: 200, success: false, error: 'timeout' });

  const m = ops.metrics({ sinceHours: 24 });
  assert.ok(m.calls >= 4); passed++;
  assert.ok(m.successRate !== null && m.successRate <= 1); passed++;
  assert.ok(m.failoverRate !== null); passed++;
  assert.ok(m.latencyMs.p50 !== null && m.latencyMs.p95 !== null); passed++;
  assert.ok(m.byProvider.ollama >= 3 && m.byProvider.groq >= 1); passed++;
  assert.ok(m.tokensTotal >= 190); passed++;

  // health shape
  const h = await ops.health();
  assert.ok('reachable' in h && 'failoverProviders' in h && 'primaryModel' in h); passed++;

  console.log(`\u2705 llmOps smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c llmOps smoke failed:', e); process.exit(1); });
