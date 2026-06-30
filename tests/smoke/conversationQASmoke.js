// tests/smoke/conversationQASmoke.js
// Offline smoke test for Feature #100. No model, no network. Exit 1 on failure.

'use strict';

const assert = require('assert');
const qa = require('../../lib/conversationQA/qaScorer');

function run() {
  const now = Date.now();
  // Good conversation: fast replies, polite, resolved.
  const good = {
    id: 'c-good', tenantId: 't1',
    messages: [
      { role: 'customer', text: 'kya ye product available hai?', ts: now },
      { role: 'bot', text: 'Ji please, available hai. Aap order karna chahenge?', ts: now + 10000 },
      { role: 'customer', text: 'haan', ts: now + 20000 },
      { role: 'bot', text: 'Shukriya, order place ho gaya.', ts: now + 25000 },
      { role: 'customer', text: 'thanks mil gaya', ts: now + 30000 }
    ]
  };
  const r1 = qa.scoreConversation(good);
  assert.ok(r1.overall >= 70, 'good conv should score >=70, got ' + r1.overall);
  assert.ok(['A', 'B'].includes(r1.grade), 'good grade A/B, got ' + r1.grade);
  assert.ok(r1.csatPredicted >= 1 && r1.csatPredicted <= 5, 'csat in range');

  // Bad conversation: slow, rude, escalation ignored, unresolved.
  const bad = {
    id: 'c-bad', tenantId: 't1',
    messages: [
      { role: 'customer', text: 'mujhe human agent chahiye, ye problem solve karo', ts: now },
      { role: 'bot', text: 'bakwas mat karo', ts: now + 700000 },
      { role: 'customer', text: 'abhi tak nahi mila, still not working', ts: now + 720000 }
    ]
  };
  const r2 = qa.scoreConversation(bad);
  assert.ok(r2.overall < r1.overall, 'bad should score lower than good');
  assert.strictEqual(r2.breakdown.escalation.triggered, true, 'escalation should trigger');
  assert.strictEqual(r2.breakdown.escalation.escalated, false, 'no human replied');
  assert.ok(r2.breakdown.tone.rude >= 1, 'rude token detected');

  // Deterministic tips always present.
  const tips = qa.deterministicTips(r2);
  assert.ok(tips.length >= 1, 'tips present');

  // Empty conversation throws.
  assert.throws(() => qa.scoreConversation({ messages: [] }), /required/);

  console.log('conversationQA smoke OK', { good: r1.overall, bad: r2.overall, grades: [r1.grade, r2.grade] });
}

run();
