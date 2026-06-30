// tests/smoke/teamInboxSmoke.js
// Offline smoke test for the team inbox. No model: handoff note uses template.
// Focus: balanced assignment, skill routing, collision lock, SLA breach, resolve.
// Exit code 0 = pass.
//
// Run: node tests/smoke/teamInboxSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template note

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const inbox = require('../../lib/teamInbox/teamInbox');
const { pickAgent } = inbox._internal;

function clear(storeId) {
  for (const s of ['_agents.json', '_conversations.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'team_inbox', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'inbox_smoke';
  clear(STORE);

  // pickAgent least-busy
  const pick = pickAgent([{ id: 'a', openCount: 3 }, { id: 'b', openCount: 1 }, { id: 'c', openCount: 2 }], 'least_busy');
  assert.strictEqual(pick.id, 'b'); passed++;

  // register agents with skills
  inbox.upsertAgent({ storeId: STORE, id: 'sara', skills: ['sales'], status: 'online' });
  inbox.upsertAgent({ storeId: STORE, id: 'bilal', skills: ['support', 'billing'], status: 'online' });
  inbox.upsertAgent({ storeId: STORE, id: 'away1', skills: ['sales'], status: 'away' });
  assert.strictEqual(inbox.listAgents({ storeId: STORE }).length, 3); passed++;

  // skill routing: a billing chat goes to bilal (only one with the skill)
  const a1 = inbox.assign({ storeId: STORE, phone: '+92300', skill: 'billing' });
  assert.strictEqual(a1.ok, true); assert.strictEqual(a1.assignee, 'bilal'); passed++;

  // sales chat goes to sara (online), never away1
  const a2 = inbox.assign({ storeId: STORE, phone: '+92301', skill: 'sales' });
  assert.strictEqual(a2.assignee, 'sara'); passed++;

  // idempotent: re-assign same phone returns same assignee (no stealing)
  const a2b = inbox.assign({ storeId: STORE, phone: '+92301', skill: 'sales' });
  assert.strictEqual(a2b.assignee, 'sara'); assert.ok(/already assigned/.test(a2b.reason)); passed++;

  // load balancing: many no-skill chats spread across online agents
  for (let i = 0; i < 6; i++) inbox.assign({ storeId: STORE, phone: '+9230' + (10 + i) });
  const agents = inbox.listAgents({ storeId: STORE });
  const sara = agents.find(a => a.id === 'sara'); const bilal = agents.find(a => a.id === 'bilal');
  assert.ok(Math.abs((sara.openCount || 0) - (bilal.openCount || 0)) <= 2, 'load should be roughly balanced'); passed++;

  // collision lock: bilal holds +92300; sara cannot claim it
  const claimConflict = inbox.claim({ storeId: STORE, phone: '+92300', agentId: 'sara' });
  assert.strictEqual(claimConflict.ok, false); assert.strictEqual(claimConflict.heldBy, 'bilal'); passed++;
  // bilal can re-claim his own (no-op)
  assert.strictEqual(inbox.claim({ storeId: STORE, phone: '+92300', agentId: 'bilal' }).ok, true); passed++;

  // SLA breach: set tiny SLA, create a chat, force overdue
  inbox.setConfig(STORE, { firstResponseSlaMins: 0.0001 });
  inbox.assign({ storeId: STORE, phone: '+92399', skill: 'support' });
  await new Promise(r => setTimeout(r, 20));
  const breaches = inbox.slaBreaches({ storeId: STORE });
  assert.ok(breaches.find(b => b.phone === '+92399' && b.type === 'first_response'), 'should flag first-response SLA breach'); passed++;

  // first response stops the first-response SLA
  inbox.recordFirstResponse({ storeId: STORE, phone: '+92399' });
  const breaches2 = inbox.slaBreaches({ storeId: STORE });
  assert.ok(!breaches2.find(b => b.phone === '+92399' && b.type === 'first_response'), 'first-response breach cleared'); passed++;

  // resolve frees the agent slot
  const before = inbox.listAgents({ storeId: STORE }).find(a => a.id === 'bilal').openCount;
  inbox.resolve({ storeId: STORE, phone: '+92300' });
  const after = inbox.listAgents({ storeId: STORE }).find(a => a.id === 'bilal').openCount;
  assert.ok(after === before - 1, 'resolve should free a slot'); passed++;

  // handoff note (fallback)
  const note = await inbox.handoffNote({ storeId: STORE, phone: '+92301', context: 'wants bulk pricing' });
  assert.ok(note.note && note.note.length); assert.strictEqual(note.source, 'fallback'); passed++;

  // queue filter
  assert.ok(inbox.queue({ storeId: STORE, status: 'assigned' }).length >= 1); passed++;

  // no online agent -> queued
  inbox.setPresence({ storeId: STORE, id: 'sara', status: 'away' });
  inbox.setPresence({ storeId: STORE, id: 'bilal', status: 'away' });
  const noAgent = inbox.assign({ storeId: STORE, phone: '+92400' });
  assert.strictEqual(noAgent.ok, false); assert.ok(/no available agent/.test(noAgent.reason)); passed++;

  // missing args throw
  let threw = false; try { inbox.assign({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'assign without phone should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 teamInbox smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c teamInbox smoke failed:', e); process.exit(1); });
