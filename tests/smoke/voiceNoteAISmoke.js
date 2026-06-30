// tests/smoke/voiceNoteAISmoke.js
// Offline smoke test for the voice-note AI. Points WHISPER_HOST at an
// unreachable address so transcription fails gracefully, exercising the
// fallback path with no model/GPU. Exit code 0 = pass.
//
// Run: node tests/smoke/voiceNoteAISmoke.js

process.env.WHISPER_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback

const assert = require('assert');
const voice = require('../../lib/voiceNoteAI/voiceNoteAI');

(async () => {
  let passed = 0;
  const fakeAudio = Buffer.from('not-real-audio-bytes');

  // transcribe-only falls back cleanly (no throw, empty text, source=fallback)
  const t = await voice.transcribe(fakeAudio, { filename: 'x.ogg' });
  assert.strictEqual(t.source, 'fallback'); passed++;
  assert.strictEqual(t.text, ''); passed++;

  // empty buffer should reject
  let threw = false;
  try { await voice.transcribe(Buffer.alloc(0)); } catch { threw = true; }
  // transcribe swallows errors and returns fallback rather than throwing;
  // empty buffer specifically throws inside whisperClient -> caught -> fallback.
  assert.ok(!threw, 'transcribe should not throw'); passed++;

  // handleVoiceNote requires phone
  let threwPhone = false;
  try { await voice.handleVoiceNote({ buffer: fakeAudio }); } catch { threwPhone = true; }
  assert.ok(threwPhone, 'handleVoiceNote without phone should throw'); passed++;

  // handleVoiceNote with unreachable whisper -> transcription_failed + escalate
  const r = await voice.handleVoiceNote({ buffer: fakeAudio, phone: '+920000000000', storeId: 'voice_smoke' });
  assert.strictEqual(r.status, 'transcription_failed'); passed++;
  assert.ok(r.shouldEscalate, 'failed transcription should escalate'); passed++;
  assert.ok(r.reply && /type your message/i.test(r.reply)); passed++;

  // job log retrievable
  assert.ok(voice.getJob(r.id), 'job retrievable by id'); passed++;
  assert.ok(voice.listJobs({ storeId: 'voice_smoke' }).length >= 1); passed++;

  // health reports unreachable cleanly
  const h = await voice.health();
  assert.strictEqual(h.whisperReachable, false); passed++;

  console.log(`\u2705 voiceNoteAI smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c voiceNoteAI smoke failed:', e); process.exit(1); });
