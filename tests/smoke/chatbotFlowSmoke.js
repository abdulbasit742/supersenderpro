// tests/smoke/chatbotFlowSmoke.js
// Offline smoke test for Feature #92. Runs with NO model and no network.
// node tests/smoke/chatbotFlowSmoke.js

'use strict';

const assert = require('assert');
const flow = require('../../lib/chatbotFlow/flowBuilder');

const T = 'tenant_smoke_92';

(async () => {
  // Define a small order-taking flow.
  const def = {
    name: 'Order Bot',
    startNode: 'welcome',
    nodes: {
      welcome: { type: 'message', text: 'Hi! Welcome to the shop.', next: 'askItem' },
      askItem: { type: 'question', text: 'What would you like to order?', field: 'item', next: 'askQty' },
      askQty: { type: 'question', text: 'How many?', field: 'qty', next: 'checkVip' },
      checkVip: { type: 'condition', field: 'item', branches: [{ equals: 'gold', next: 'handoff' }], next: 'confirm' },
      handoff: { type: 'action', action: 'handoff', next: 'confirm' },
      confirm: { type: 'end', text: 'Got it, order placed!' }
    }
  };

  const created = flow.defineFlow(T, def);
  assert.ok(created.id, 'flow should get an id');

  const list = flow.listFlows(T);
  assert.ok(list.find(f => f.id === created.id), 'flow should be listed');

  // Start: should emit welcome + first question, then await item.
  let r = await flow.run(T, created.id, '+92300', undefined, {});
  assert.deepStrictEqual(r.messages, ['Hi! Welcome to the shop.', 'What would you like to order?']);
  assert.strictEqual(r.awaiting, 'askItem');
  assert.strictEqual(r.done, false);

  // Answer item -> ask qty.
  r = await flow.run(T, created.id, '+92300', 'gold', {});
  assert.deepStrictEqual(r.messages, ['How many?']);
  assert.strictEqual(r.awaiting, 'askQty');

  // Answer qty -> condition (item==gold) -> handoff -> end.
  r = await flow.run(T, created.id, '+92300', '2', {});
  assert.ok(r.messages.includes('Got it, order placed!'), 'should reach end');
  assert.strictEqual(r.done, true);
  assert.strictEqual(r.handoff, true, 'gold item should trigger handoff');
  assert.strictEqual(r.vars.item, 'gold');
  assert.strictEqual(r.vars.qty, '2');

  // Tenant isolation: another tenant cannot see this flow.
  assert.strictEqual(flow.getFlow('other_tenant', created.id), null);

  // Missing tenant throws.
  let threw = false;
  try { flow.run('', created.id, 'x'); } catch (_) { threw = true; }
  assert.ok(threw, 'missing tenant should throw');

  // Cleanup.
  flow.resetSession(T, created.id, '+92300');
  flow.deleteFlow(T, created.id);

  const h = flow.health();
  assert.strictEqual(h.ok, true);

  console.log('chatbotFlowSmoke: PASS');
})().catch(e => { console.error('chatbotFlowSmoke: FAIL', e); process.exit(1); });
