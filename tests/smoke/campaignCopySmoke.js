// tests/smoke/campaignCopySmoke.js
// Offline smoke test for the campaign copywriter. No model: AI Brain is
// unconfigured so generation uses the deterministic template fallback.
// Exit code 0 = pass.
//
// Run: node tests/smoke/campaignCopySmoke.js

const assert = require('assert');
const copy = require('../../lib/campaignCopy/campaignCopy');
const { splitVariants, templateFallback } = copy._internal;

(async () => {
  let passed = 0;

  // lint flags spammy copy
  const bad = copy.lint('FREE PRIZE!!! CLICK HERE NOW 100% GUARANTEED act now www.a.com www.b.com');
  assert.ok(bad.score >= 30, `expected risky, got ${bad.score}`); passed++;
  assert.ok(bad.level === 'high' || bad.level === 'medium'); passed++;
  assert.ok(bad.issues.length >= 1); passed++;

  // lint is gentle on clean copy
  const good = copy.lint('Hi {{name}}, new arrivals just dropped. Reply YES to see them. Reply STOP to opt out.');
  assert.ok(good.score < 30, `expected low risk, got ${good.score}`); passed++;
  assert.strictEqual(good.level, 'low'); passed++;

  // variant splitter
  const parts = splitVariants('Variant A: hello\nVariant B: hi there\nVariant C: hey', 3);
  assert.strictEqual(parts.length, 3); passed++;
  assert.ok(/hello/.test(parts[0])); passed++;

  // template fallback shape
  const tf = templateFallback({ brief: 'eid sale', cta: 'Reply YES', n: 3, language: 'en' });
  assert.strictEqual(tf.length, 3); passed++;
  assert.ok(tf.every(t => t.includes('{{name}}')), 'fallbacks should carry merge field'); passed++;

  // generate end-to-end (fallback path) returns labeled variants with lint
  const r = await copy.generate({ brief: 'Eid sale 20% off', cta: 'Reply YES', variants: 3 });
  assert.strictEqual(r.source, 'fallback'); passed++;
  assert.strictEqual(r.variants.length, 3); passed++;
  assert.ok(r.variants[0].label === 'Variant A' && r.variants[0].lint && typeof r.variants[0].lint.score === 'number'); passed++;

  // missing input throws
  let threw = false;
  try { await copy.generate({}); } catch { threw = true; }
  assert.ok(threw, 'generate with no brief/offer should throw'); passed++;

  console.log(`\u2705 campaignCopy smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c campaignCopy smoke failed:', e); process.exit(1); });
