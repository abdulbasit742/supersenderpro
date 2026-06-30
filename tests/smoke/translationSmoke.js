// tests/smoke/translationSmoke.js
// Offline smoke test for the translator. No model: AI Brain unconfigured, so
// translate() returns passthrough. Detection + contact-language memory + routing
// are exercised directly. Exit code 0 = pass.
//
// Run: node tests/smoke/translationSmoke.js

const assert = require('assert');
const t = require('../../lib/translation/translator');

(async () => {
  let passed = 0;

  // detection
  assert.strictEqual(t.detectLanguage('kitne ka hai bhai'), 'roman-ur'); passed++;
  assert.strictEqual(t.detectLanguage('hello there how are you'), 'en'); passed++;
  assert.strictEqual(t.detectLanguage('\u06A9\u06CC\u0627 \u062D\u0627\u0644 \u06C1\u06D2'), 'ur'); passed++;

  // same-language translate is a no-op
  const noop = await t.translate('hello', { to: 'en', from: 'en' });
  assert.strictEqual(noop.source, 'noop'); passed++;
  assert.strictEqual(noop.text, 'hello'); passed++;

  // cross-language with no model -> passthrough (text unchanged, never throws)
  const pt = await t.translate('kitne ka hai', { to: 'en' });
  assert.strictEqual(pt.source, 'passthrough'); passed++;
  assert.strictEqual(pt.from, 'roman-ur'); passed++;
  assert.strictEqual(pt.to, 'en'); passed++;

  // inbound records the customer's language for later outbound targeting
  const STORE = 'translation_smoke';
  const inb = await t.translateInbound({ storeId: STORE, phone: '+92300', text: '\u06A9\u06CC\u0627 \u0642\u06CC\u0645\u062A \u06C1\u06D2', agentLang: 'en' });
  assert.strictEqual(inb.customerLang, 'ur'); passed++;
  assert.strictEqual(t.getContactLang(STORE, '+92300'), 'ur'); passed++;

  // outbound auto-targets the remembered language
  const outb = await t.translateOutbound({ storeId: STORE, phone: '+92300', text: 'It costs 500 rupees', agentLang: 'en' });
  assert.strictEqual(outb.customerLang, 'ur', 'outbound should target remembered customer lang'); passed++;

  // empty text is a clean no-op
  const empty = await t.translate('', { to: 'ur' });
  assert.strictEqual(empty.source, 'noop'); passed++;

  // health shape
  const h = t.health();
  assert.ok('brainBridge' in h && 'agentLanguage' in h); passed++;

  console.log(`\u2705 translation smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c translation smoke failed:', e); process.exit(1); });
