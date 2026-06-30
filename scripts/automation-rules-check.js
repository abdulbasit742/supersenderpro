#!/usr/bin/env node
// scripts/automation-rules-check.js — Offline safety + behavior check. Run: npm run automation-rules:check

const ar = require('../lib/automationRules');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ar && ar.engine, 'module loads');

 // Reject a rule with an unknown action type.
 let threw = false; try { ar.ruleStore.upsert({ event: 'payment.succeeded', actions: [{ type: 'nuke_everything' }] }); } catch (_e) { threw = true; }
 assert(threw, 'rejects an unknown action type');

 // A rule with a condition: only fire when amount >= 1000, action = track_event (always safe).
 const rule = ar.ruleStore.upsert({ name: 'Big payment tag', event: 'payment.succeeded', condition: { all: [{ field: 'amount', op: 'gte', value: 1000 }] }, actions: [{ type: 'track_event', name: 'big_payment' }], throttleMinutes: 0 });
 assert(rule.id && rule.actions.length === 1, 'rule created with one action');

 // Below threshold -> no match.
 const small = await ar.engine.emit('payment.succeeded', { contact: '+923001234567', amount: 500 });
 assert(small.matchedRules === 0, 'condition excludes amount below threshold');

 // At/above threshold -> rule fires + action runs.
 const big = await ar.engine.emit('payment.succeeded', { contact: '+923001234567', amount: 5000 });
 assert(big.matchedRules === 1, 'condition matches amount over threshold');
 assert(big.fired[0].actions[0].type === 'track_event', 'the track_event action ran');

 // Missing target dept degrades to skipped, never throws (enroll_drip with no drip dept in this isolated run is still safe).
 const r2 = ar.ruleStore.upsert({ name: 'Assign on ticket', event: 'ticket.created', actions: [{ type: 'assign_agent', skill: 'billing' }], throttleMinutes: 0 });
 const fire2 = await ar.engine.emit('ticket.created', { conversationId: 'tkt-1' });
 assert(fire2.fired.length === 1 && typeof fire2.fired[0].actions[0].ok === 'boolean', 'action result captured (ok true/false), no throw on missing dep');

 // Throttle: a rule with a window blocks an immediate repeat for the same contact.
 ar.ruleStore.upsert({ id: 'thr', name: 'Throttled', event: 'custom', actions: [{ type: 'track_event', name: 't' }], throttleMinutes: 10 });
 const f1 = await ar.engine.emit('custom', { contact: 'c-throttle' });
 const f2 = await ar.engine.emit('custom', { contact: 'c-throttle' });
 assert(f1.matchedRules >= 1 && f2.throttled >= 1, 'second identical event within window is throttled');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all automation-rules checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
