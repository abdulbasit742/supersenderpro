'use strict';
/**
 * tests/smoke/conversationalSupportSmoke.js - end-to-end smoke for the Conversational AI Support
 * agent on a throwaway tenant. Runs entirely on the JSON driver in forced dry-run, no model or
 * network needed (deterministic fallbacks). Exits non-zero on failure so ci-smoke catches it.
 */
const assert = require('assert');
const CS = require('../../lib/conversationalSupport');

async function main() {
  const tid = 'smoke_convsupport_' + Date.now().toString(36);
  const opts = { forceDryRun: true };
  const phone = '+923001234567';

  // Seed KB (products + default FAQs).
  CS.seedExample(tid);
  assert.ok(CS.kb.listProducts(tid).length >= 2, 'products seeded');
  assert.ok(CS.kb.listFaqs(tid).length >= 1, 'faqs seeded');

  // 1) FAQ answer (deterministic fallback should ground on the delivery FAQ).
  const r1 = await CS.handleMessage(tid, { phone, name: 'Ali', text: 'how long does delivery take?' }, opts);
  assert.ok(r1.reply && r1.reply.length, 'faq produced a reply');
  assert.strictEqual(r1.delivered, false, 'dry-run never marks delivered');

  // 2) Order capture: start -> product -> address -> confirm -> placed.
  const o1 = await CS.handleMessage(tid, { phone, text: 'I want to order Pro Pack' }, opts);
  assert.strictEqual(o1.intent, 'order', 'order intent detected');
  const o2 = await CS.handleMessage(tid, { phone, text: 'House 5, Street 2, Lahore' }, opts);
  assert.ok(/confirm/i.test(o2.reply) || /haan/i.test(o2.reply), 'asks for confirmation');
  const o3 = await CS.handleMessage(tid, { phone, text: 'haan' }, opts);
  assert.strictEqual(o3.orderPlaced, true, 'order placed (dry-run/staged)');

  // 3) Explicit human handoff -> conversation escalated + queued.
  const phone2 = '+923009998888';
  const h1 = await CS.handleMessage(tid, { phone: phone2, text: 'I want to talk to a human agent' }, opts);
  assert.strictEqual(h1.escalated, true, 'escalated to human');
  assert.ok(h1.handoffId, 'handoff enqueued');
  const queue = CS.escalation.listQueue(tid, 'open');
  assert.ok(queue.length >= 1, 'handoff visible in queue');

  // After escalation, agent stays silent (human owns it).
  const h2 = await CS.handleMessage(tid, { phone: phone2, text: 'hello?' }, opts);
  assert.strictEqual(h2.reply, null, 'no auto-reply once escalated');

  console.log('[conversationalSupportSmoke] OK - faq, order(dry-run), handoff all passed');
}

main().catch((e) => { console.error('[conversationalSupportSmoke] FAILED:', e && e.message); process.exit(1); });
