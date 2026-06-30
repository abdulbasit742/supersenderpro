'use strict';
// Offline smoke test for AI Sentiment Trend Monitor (#120).
// Forces the model host unreachable so we prove the deterministic core works.

process.env.OLLAMA_HOST = 'http://127.0.0.1:1';
process.env.LLM_HUB_DRY_RUN = 'true';

const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

// isolate data dir for the test
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sent-'));
process.chdir(tmp);

const st = require(path.join(__dirname, '..', '..', 'lib', 'sentimentTrend', 'sentimentTrend'));

(async () => {
  // 1) scoring
  assert.strictEqual(st.scoreText('bohat acha service shukria').label, 'positive');
  assert.strictEqual(st.scoreText('ye bilkul bekar hai fraud refund karo').label, 'negative');
  assert.strictEqual(st.scoreText('order kab aayega').label, 'neutral');

  // 2) tenant isolation
  assert.throws(() => st.record(null, { text: 'hi' }), /tenantId required/);

  // 3) window stats + records
  const T = 'tenantA';
  const now = Date.now();
  for (let i = 0; i < 6; i++) st.record(T, { text: 'ganda bekar fraud', ts: now - i * 1000 });
  st.record(T, { text: 'acha shukria', ts: now });
  const stats = st.windowStats(T, { now });
  assert.ok(stats.count >= 7, 'should have events');
  assert.ok(stats.counts.negative >= 6, 'negatives counted');

  // 4) spike detection
  const spike = st.detectSpike(T, { now, minSample: 5, negRateThreshold: 0.4 });
  assert.strictEqual(spike.spike, true, 'should detect negative spike');
  assert.ok(spike.reason, 'reason present');

  // 5) summarize falls back gracefully (no model reachable)
  const sum = await st.summarize(T, { now });
  assert.strictEqual(sum.ai, false, 'ai disabled offline');
  assert.ok(/ALERT|Last window/.test(sum.summary), 'fallback summary present');

  // tenant B isolation
  const statsB = st.windowStats('tenantB', { now });
  assert.strictEqual(statsB.count, 0, 'tenantB sees nothing');

  console.log('sentimentTrend smoke OK');
})().catch((e) => { console.error(e); process.exit(1); });
