'use strict';
/**
 * #107 offline smoke test. Points AI at an unreachable host so the
 * deterministic core is exercised with NO model available.
 */
process.env.OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:0';
process.env.LLM_DEFAULT_PROVIDER = process.env.LLM_DEFAULT_PROVIDER || 'ollama';

const assert = require('assert');
const ld = require('../../lib/languageDetect/languageDetect');

(async () => {
  // Arabic-script Urdu
  let r = await ld.detect('السلام علیکم، آپ کیسے ہیں؟', { useAI: false });
  assert.strictEqual(r.lang, 'ur', 'urdu script -> ur');
  assert.strictEqual(r.lane, 'urdu');

  // Devanagari Hindi
  r = await ld.detect('नमस्ते, आप कैसे हैं?', { useAI: false });
  assert.strictEqual(r.lang, 'hi', 'devanagari -> hi');
  assert.strictEqual(r.lane, 'hindi');

  // Roman Urdu
  r = await ld.detect('bhai aap order kitna ka hai mujhe chahiye', { useAI: false });
  assert.strictEqual(r.lang, 'roman-ur', 'roman urdu keywords -> roman-ur');
  assert.strictEqual(r.lane, 'urdu');

  // English
  r = await ld.detect('Hello, what is the price of this order please?', { useAI: false });
  assert.strictEqual(r.lang, 'en', 'english keywords -> en');
  assert.strictEqual(r.lane, 'english');

  // Arabic (no urdu-only letters)
  r = await ld.detect('مرحبا كيف حالك اليوم', { useAI: false });
  assert.ok(r.lang === 'ar' || r.lang === 'ur', 'arabic script detected');

  // Empty
  r = await ld.detect('   ', { useAI: false });
  assert.strictEqual(r.lang, 'unknown');

  // Sticky memory: low-confidence message falls back to remembered lang
  await ld.detect('bhai aap kaise hain order chahiye', { useAI: false, tenantId: 't1', contactId: 'c1' });
  const r2 = await ld.detect('ok', { useAI: false, tenantId: 't1', contactId: 'c1' });
  assert.ok(['roman-ur', 'en'].includes(r2.lang), 'sticky fallback returns a lane');
  ld.forgetContact('t1', 'c1');

  console.log('languageDetect smoke: OK');
})().catch((e) => { console.error('languageDetect smoke FAILED:', e); process.exit(1); });
