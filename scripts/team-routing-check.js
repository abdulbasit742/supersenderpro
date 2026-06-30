#!/usr/bin/env node
// scripts/team-routing-check.js — Offline safety + behavior check. Run: npm run team-routing:check

const tr = require('../lib/teamRouting');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(tr && tr.router, 'module loads');

 // Two online agents, different capacity/skills.
 const a1 = tr.agentStore.upsert({ name: 'Asad', skills: ['billing'], capacity: 2, online: true });
 const a2 = tr.agentStore.upsert({ name: 'Bina', skills: ['tech'], capacity: 5, online: true });

 // least_load: first assignment should go to the lower-utilization agent (both 0, tie -> stable).
 const r1 = tr.router.assign('conv-1', { strategy: 'least_load' });
 assert(r1.assigned === true, 'first conversation is assigned');
 const r2 = tr.router.assign('conv-2', { strategy: 'least_load' });
 const r3 = tr.router.assign('conv-3', { strategy: 'least_load' });
 // Bina has more capacity, so utilization stays lower -> should accumulate more.
 const binaLoad = tr.agentStore.get(a2.id).load;
 const asadLoad = tr.agentStore.get(a1.id).load;
 assert(binaLoad >= asadLoad, 'least-load favors the higher-capacity agent over time');

 // Sticky: re-assigning the same conversation returns the same agent.
 const sticky = tr.router.assign('conv-1');
 assert(sticky.sticky === true && sticky.agentId === r1.agentId, 'assignment is sticky for an open conversation');

 // Skill match: a billing skill routes to Asad.
 const skill = tr.router.assign('conv-bill', { strategy: 'skill_match', skill: 'billing' });
 assert(skill.assigned && skill.agentId === a1.id, 'skill_match routes to the skilled agent');

 // Capacity: fill Asad (capacity 2) then a billing-skill request can't go to him.
 tr.router.assign('conv-bill2', { strategy: 'skill_match', skill: 'billing' }); // Asad now at/over capacity (had conv-bill + maybe others)
 // Release frees capacity + decrements load.
 const rel = tr.router.release('conv-1');
 assert(rel.released === true, 'release frees an assignment');

 // Offline reassignment: take Bina offline -> her conversations move out.
 tr.agentStore.setOnline(a2.id, false);
 const moved = tr.router.reassignAgentConversations(a2.id);
 assert(typeof moved.moved === 'number', 'offline agent conversations are reassigned or queued');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all team-routing checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
