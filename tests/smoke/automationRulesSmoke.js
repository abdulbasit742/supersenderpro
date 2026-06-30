#!/usr/bin/env node
// tests/smoke/automationRulesSmoke.js — Smoke test for conditions + dry-run + multi-action. Run: npm run automation-rules:smoke

const ar = require('../../lib/automationRules');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ar.engine, 'engine present');

 // Condition matcher: AND/OR, no eval.
 t(ar.conditionMatcher.matches({ event: 'nps.detractor', score: 3 }, { all: [{ field: 'score', op: 'lte', value: 6 }] }) === true, 'numeric lte condition matches');
 t(ar.conditionMatcher.matches({ event: 'x', tag: 'vip' }, { any: [{ field: 'tag', op: 'eq', value: 'vip' }, { field: 'tag', op: 'eq', value: 'gold' }] }) === true, 'OR condition matches');

 // Multi-action rule fires all actions in order.
 const rule = ar.ruleStore.upsert({ name: 'Detractor playbook', event: 'nps.detractor', actions: [ { type: 'track_event', name: 'detractor' }, { type: 'raise_alert', alertEvent: 'sla.breach' } ], throttleMinutes: 0 });
 const fired = await ar.engine.emit('nps.detractor', { contact: '+923009998877', score: 2 });
 t(fired.matchedRules === 1 && fired.fired[0].actions.length === 2, 'rule ran both actions in the pipeline');

 // dry-run mode plans without executing.
 process.env.AUTOMATION_RULES_DRY_RUN = 'true';
 delete require.cache[require.resolve('../../lib/automationRules/config')];
 delete require.cache[require.resolve('../../lib/automationRules/engine')];
 delete require.cache[require.resolve('../../lib/automationRules')];
 const ar2 = require('../../lib/automationRules');
 ar2.ruleStore.upsert({ id: 'dry', name: 'Dry', event: 'custom', actions: [{ type: 'track_event', name: 'x' }], throttleMinutes: 0 });
 const dry = await ar2.engine.emit('custom', { contact: 'c-dry' });
 t(dry.fired[0].dryRun === true && dry.fired[0].actions[0].planned === true, 'dry-run plans actions without executing');

 const ov = ar2.engine.overview();
 t(typeof ov.cards.rules === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
