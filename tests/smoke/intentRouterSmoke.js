// tests/smoke/intentRouterSmoke.js
// Offline smoke test for the intent router. No model: keyword classifier is
// exercised directly (AI tier is skipped when the brain is unconfigured).
// Exit code 0 = pass.
//
// Run: node tests/smoke/intentRouterSmoke.js

const assert = require('assert');
const ir = require('../../lib/intentRouter/intentRouter');
const { classifyKeyword } = ir._internal;

(async () => {
  let passed = 0;

  // keyword classification across intents
  assert.strictEqual(classifyKeyword('what is the price, I want to order').intent, 'sales'); passed++;
  assert.strictEqual(classifyKeyword('I want a refund, this is a scam').intent, 'complaint'); passed++;
  assert.strictEqual(classifyKeyword('my invoice payment was charged twice').intent, 'billing'); passed++;
  assert.strictEqual(classifyKeyword('when will my delivery be shipped, tracking?').intent, 'shipping'); passed++;
  assert.strictEqual(classifyKeyword('assalam o alaikum').intent, 'greeting'); passed++;
  assert.strictEqual(classifyKeyword('click here you have won free money').intent, 'spam'); passed++;
  assert.strictEqual(classifyKeyword('the app is not working, how do I setup').intent, 'support'); passed++;

  // unknown -> other, low confidence
  const o = classifyKeyword('qwerty zxcvb');
  assert.strictEqual(o.intent, 'other'); passed++;
  assert.ok(o.confidence <= 0.4); passed++;

  // route maps to tags + queue/team/priority
  const r = await ir.route({ storeId: 'intent_smoke', text: 'I want a refund right now, total fraud' });
  assert.strictEqual(r.intent, 'complaint'); passed++;
  assert.strictEqual(r.routing.priority, 'urgent'); passed++;
  assert.ok(r.tags.includes('at-risk')); passed++;

  const r2 = await ir.route({ storeId: 'intent_smoke', text: 'how much for the pro plan?' });
  assert.strictEqual(r2.intent, 'sales'); passed++;
  assert.strictEqual(r2.routing.queue, 'sales'); passed++;

  // missing text throws
  let threw = false;
  try { await ir.route({ text: '' }); } catch { threw = true; }
  assert.ok(threw, 'route with no text should throw'); passed++;

  // custom rules persist + apply
  ir.setRules('intent_smoke', { routing: { sales: { queue: 'vip-sales', team: 'closers', priority: 'urgent' } } });
  const r3 = await ir.route({ storeId: 'intent_smoke', text: 'price please, want to buy' });
  assert.strictEqual(r3.routing.queue, 'vip-sales'); passed++;

  console.log(`\u2705 intentRouter smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c intentRouter smoke failed:', e); process.exit(1); });
