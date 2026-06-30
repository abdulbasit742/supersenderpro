// tests/smoke/voiceReplySmoke.js
// Offline smoke test for voice replies. Points TTS_HOST at an unreachable
// address so synthesis fails gracefully to text. Exit code 0 = pass.
//
// Run: node tests/smoke/voiceReplySmoke.js

process.env.TTS_HOST = 'http://127.0.0.1:0'; // unreachable -> text fallback
process.env.VOICE_REPLY_MAX_CHARS = '100';

const assert = require('assert');
const voiceReply = require('../../lib/voiceReply/voiceReply');
const { guessLanguage, voiceForLanguage } = voiceReply._internal;

(async () => {
  let passed = 0;

  // language guessing
  assert.strictEqual(guessLanguage('kitne ka hai bhai'), 'roman-ur'); passed++;
  assert.strictEqual(guessLanguage('hello, how much is this'), 'en'); passed++;
  assert.strictEqual(guessLanguage('\u06A9\u06CC\u0627 \u062D\u0627\u0644 \u06C1\u06D2'), 'ur'); passed++;

  // voice selection maps language -> a voice string
  assert.ok(typeof voiceForLanguage('en') === 'string' && voiceForLanguage('en').length); passed++;
  assert.ok(typeof voiceForLanguage('ur') === 'string'); passed++;

  // short text, TTS unreachable -> text fallback (no throw)
  const r = await voiceReply.speak({ storeId: 'vr_smoke', phone: '+92300', text: 'Sure, it is 1500 rupees.' });
  assert.strictEqual(r.mode, 'text'); passed++;
  assert.strictEqual(r.reason, 'tts_unavailable'); passed++;
  assert.ok(r.text && r.text.length); passed++;

  // long text -> length guard keeps it text BEFORE even trying TTS
  const long = 'x'.repeat(250);
  const rl = await voiceReply.speak({ storeId: 'vr_smoke', phone: '+92300', text: long });
  assert.strictEqual(rl.mode, 'text'); passed++;
  assert.strictEqual(rl.reason, 'too_long'); passed++;

  // force should attempt TTS even when long (still fails to text here, but reason changes)
  const rf = await voiceReply.speak({ storeId: 'vr_smoke', phone: '+92300', text: long, force: true });
  assert.strictEqual(rf.mode, 'text'); passed++;
  assert.strictEqual(rf.reason, 'tts_unavailable', 'forced long text should attempt TTS, then fall back'); passed++;

  // missing text throws
  let threw = false; try { await voiceReply.speak({ storeId: 'vr_smoke' }); } catch { threw = true; }
  assert.ok(threw, 'speak without text should throw'); passed++;

  // jobs are logged + retrievable
  assert.ok(voiceReply.listJobs({ storeId: 'vr_smoke' }).length >= 1); passed++;

  // health reports unreachable cleanly
  const h = await voiceReply.health();
  assert.strictEqual(h.ttsReachable, false); passed++;

  console.log(`\u2705 voiceReply smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c voiceReply smoke failed:', e); process.exit(1); });
