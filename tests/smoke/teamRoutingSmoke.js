#!/usr/bin/env node
// tests/smoke/teamRoutingSmoke.js — Smoke test for round-robin + queue + working hours. Run: npm run team-routing:smoke

const tr = require('../../lib/teamRouting');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!tr.router, 'router present');

 // round_robin spreads across agents.
 const x = tr.agentStore.upsert({ id: 'rr-x', name: 'X', capacity: 50, online: true });
 const y = tr.agentStore.upsert({ id: 'rr-y', name: 'Y', capacity: 50, online: true });
 const seen = new Set();
 for (let i = 0; i < 6; i++) { const r = tr.router.assign('rr-conv-' + i, { strategy: 'round_robin' }); if (r.agentId) seen.add(r.agentId); }
 t(seen.size >= 2, 'round-robin distributes across multiple agents');

 // Strategy validation falls back to default for an unknown strategy (no throw).
 const r = tr.router.assign('rr-conv-bad', { strategy: 'nonsense' });
 t(r.assigned === true, 'unknown strategy falls back to default and still assigns');

 // least-load utilization helper.
 const pick = tr.strategies.leastLoad([{ id: 'a', load: 9, capacity: 10 }, { id: 'b', load: 2, capacity: 10 }]);
 t(pick.id === 'b', 'least-load picks the less-utilized agent');

 // working hours filter.
 t(tr.strategies._withinHours({ workingHours: { startHour: 9, endHour: 17 } }, 12) === true, 'within working hours at noon');
 t(tr.strategies._withinHours({ workingHours: { startHour: 9, endHour: 17 } }, 3) === false, 'outside working hours at 3am');
 t(tr.strategies._withinHours({ workingHours: { startHour: 22, endHour: 6 } }, 23) === true, 'overnight window includes 11pm');

 const ov = tr.router.overview();
 t(typeof ov.cards.agents === 'number' && typeof ov.cards.totalCapacity === 'number', 'overview returns capacity + load cards');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
