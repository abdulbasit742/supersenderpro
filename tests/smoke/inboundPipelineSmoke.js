// tests/smoke/inboundPipelineSmoke.js
// Offline smoke test for the inbound pipeline. No model + unreachable hosts, so
// every AI stage degrades gracefully. The point of this test is that the
// orchestrator NEVER throws and always returns a structured result with a trace,
// regardless of which features are installed/reachable. Exit code 0 = pass.
//
// Run: node tests/smoke/inboundPipelineSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.WHISPER_HOST = 'http://127.0.0.1:0';
process.env.TTS_HOST = 'http://127.0.0.1:0';

const assert = require('assert');
const pipeline = require('../../lib/inboundPipeline/inboundPipeline');

(async () => {
  let passed = 0;
  const STORE = 'pipeline_smoke';

  // health reports which features are wired (booleans)
  const h = pipeline.health();
  assert.ok(h.features && typeof h.features.supportAgent === 'boolean'); passed++;

  // a plain text message: pipeline runs, never throws, returns a trace
  const r = await pipeline.handleInbound({ storeId: STORE, phone: '+92300', text: 'how much is the red shirt?' });
  assert.ok(r && Array.isArray(r.trace), 'should return a trace array'); passed++;
  assert.strictEqual(r.phone, '+92300'); passed++;
  assert.ok('reply' in r, 'result should carry a reply field (may be null offline)'); passed++;
  assert.ok('shouldEscalate' in r); passed++;

  // every trace stage records ok:true/false without throwing
  assert.ok(r.trace.every(s => typeof s.ok === 'boolean')); passed++;

  // a voice message with bogus audio: transcription stage fails gracefully, pipeline still returns
  const rv = await pipeline.handleInbound({ storeId: STORE, phone: '+92301', type: 'voice', media: Buffer.from('not-audio') });
  assert.ok(rv && Array.isArray(rv.trace)); passed++;
  assert.strictEqual(rv.type, 'voice'); passed++;
  assert.ok(rv.trace.find(s => s.stage === 'voice_transcribe'), 'voice stage should be attempted'); passed++;

  // an image message with bogus bytes: vision stage fails gracefully
  const ri = await pipeline.handleInbound({ storeId: STORE, phone: '+92302', type: 'image', media: Buffer.from('not-image'), text: 'do you have this?' });
  assert.ok(ri && Array.isArray(ri.trace)); passed++;
  assert.strictEqual(ri.type, 'image'); passed++;

  // missing phone throws (the only hard requirement)
  let threw = false; try { await pipeline.handleInbound({ text: 'hi' }); } catch { threw = true; }
  assert.ok(threw, 'handleInbound without phone should throw'); passed++;

  // wiredFeatures is a stable shape
  const wf = pipeline.wiredFeatures();
  assert.ok('supportAgent' in wf && 'guardrails' in wf && 'translation' in wf); passed++;

  console.log(`\u2705 inboundPipeline smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c inboundPipeline smoke failed:', e); process.exit(1); });
