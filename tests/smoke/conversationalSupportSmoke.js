'use strict';
/**
 * tests/smoke/conversationalSupportSmoke.js - offline smoke test for the Conversational Support
 * agent. No services, no network: forces dry-run + skips LLM so it is deterministic in CI.
 * Run: node tests/smoke/conversationalSupportSmoke.js
 */
const assert = require('assert');
const CS = require('../../lib/conversationalSupport');

(async () => {
  const T = 'smoke_' + Date.now().toString(36);
  const opts = { forceDryRun: true, noLLM: true };
  const phone = '+923001234567';

  // 1) seed KB
  const seed = CS.seedExample(T);
  assert.ok(seed.seeded && seed.entries.length >= 3, 'KB should seed');

  // 2) greeting
  let r = await CS.handle(T, { phone, name: 'Ali' }, 'salam', opts);
  assert.strictEqual(r.intent, 'greeting', 'should greet');
  assert.ok(/assalam/i.test(r.reply), 'greeting text');

  // 3) FAQ grounded answer (deterministic, no LLM => returns KB answer)
  r = await CS.handle(T, { phone }, 'delivery kitne din mein hoti hai?', opts);
  assert.strictEqual(r.intent, 'faq', 'should answer from KB');
  assert.ok(r.reply && /delivery|days|din/i.test(r.reply), 'faq answer content');

  // 4) order flow end-to-end
  r = await CS.handle(T, { phone }, 'mujhe order karna hai', opts);
  assert.strictEqual(r.action, 'order_started', 'order starts');
  r = await CS.handle(T, { phone }, '2 x Black T-Shirt', opts);
  assert.strictEqual(r.action, 'order_collecting', 'collecting items');
  r = await CS.handle(T, { phone }, 'nahi', opts);
  assert.ok(/address/i.test(r.reply), 'asks for address');
  r = await CS.handle(T, { phone }, 'Ali Raza, House 12, Lahore', opts);
  assert.ok(/confirm/i.test(r.reply), 'asks to confirm');
  r = await CS.handle(T, { phone }, 'haan', opts);
  assert.strictEqual(r.action, 'order_placed', 'order placed');
  assert.ok(r.order && r.order.items.length === 1 && r.order.dryRun === true, 'order is dry-run');

  // 5) human escalation
  r = await CS.handle(T, { phone }, 'mujhe agent se baat karni hai', opts);
  assert.strictEqual(r.escalated, true, 'should escalate to human');
  assert.ok(CS.escalation.list(T, 'open').length >= 1, 'open handoff exists');

  // 6) tenant isolation
  assert.strictEqual(CS.kb.list('other_' + T).length, 0, 'other tenant sees no KB');

  console.log('conversationalSupportSmoke OK:', JSON.stringify({ kb: seed.entries.length, orders: CS.orderTaking.listOrders(T).length, handoffs: CS.escalation.list(T).length }));
})().catch((e) => { console.error('conversationalSupportSmoke FAILED:', e && e.message); process.exit(1); });
