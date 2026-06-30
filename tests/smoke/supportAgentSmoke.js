// tests/smoke/supportAgentSmoke.js
// Offline smoke test for the conversational support agent.
// Runs without any model: it stubs the AI Brain by setting no provider, so the
// agent exercises its heuristics + fallback path. Exit code 0 = pass.
//
// Run: node tests/smoke/supportAgentSmoke.js

const assert = require('assert');
const agent = require('../../ai/agents/supportAgent');

(async () => {
  const { detectLanguage, detectIntent, detectSentiment, parseControlTags } = agent._internal;
  let passed = 0;

  // Language detection
  assert.strictEqual(detectLanguage('kitne ka hai bhai'), 'roman-ur'); passed++;
  assert.strictEqual(detectLanguage('hello there'), 'en'); passed++;

  // Intent
  const kb = agent.getKnowledgeBase('smoke_store');
  assert.strictEqual(detectIntent('I want to buy 2 licenses', kb), 'order'); passed++;
  assert.strictEqual(detectIntent('can I talk to a human', kb), 'escalate'); passed++;
  assert.strictEqual(detectIntent('assalam o alaikum', kb), 'greeting'); passed++;

  // Sentiment
  assert.strictEqual(detectSentiment('this is a scam, total fraud'), 'negative'); passed++;

  // Control tag parsing
  const p1 = parseControlTags('Sure, I can help!\n[ORDER] product=Pro Plan; qty=3');
  assert.strictEqual(p1.order.product, 'Pro Plan'); assert.strictEqual(p1.order.qty, 3);
  assert.ok(!p1.reply.includes('[ORDER]')); passed++;

  const p2 = parseControlTags('Let me get someone.\n[ESCALATE] refund request');
  assert.strictEqual(p2.escalate, 'refund request'); passed++;

  // End-to-end: hard escalation should never throw and must escalate.
  const r = await agent.handleMessage({ storeId: 'smoke_store', phone: '+920000000000', message: 'I want a refund, this is a scam' });
  assert.ok(r.shouldEscalate, 'expected escalation'); assert.ok(r.reply && r.reply.length); passed++;
  agent.resetConversation('smoke_store', '+920000000000');

  console.log(`\u2705 supportAgent smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c supportAgent smoke failed:', e); process.exit(1); });
