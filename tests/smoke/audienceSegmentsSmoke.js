#!/usr/bin/env node
// tests/smoke/audienceSegmentsSmoke.js — Smoke test for the rule engine + caps. Run: npm run audience-segments:smoke

const as = require('../../lib/audienceSegments');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!as.ruleEngine, 'rule engine present');

 const c = { contact: '+1', name: 'Ada Khan', tags: ['vip'], attributes: { city: 'karachi' }, totalSpend: 300, lastActiveAt: new Date().toISOString(), createdAt: new Date(Date.now() - 10 * 864e5).toISOString() };
 t(as.ruleEngine.evalCondition({ field: 'name', op: 'contains', value: 'khan' }, c), 'contains is case-insensitive');
 t(as.ruleEngine.evalCondition({ field: 'attr:city', op: 'eq', value: 'karachi' }, c), 'attr field resolves');
 t(as.ruleEngine.evalCondition({ field: 'createdDays', op: 'gte', value: 7 }, c), 'createdDays computed');
 t(as.ruleEngine.evalCondition({ field: 'tag', op: 'not_has_tag', value: 'spam' }, c), 'not_has_tag works');
 t(!as.ruleEngine.evalCondition({ field: 'totalSpend', op: 'lt', value: 100 }, c), 'lt false for 300 < 100');

 // empty segment = everyone
 t(as.ruleEngine.matches({ match: 'all', conditions: [] }, c), 'empty segment matches everyone');

 // invalid op rejected
 let threw = false; try { as.ruleEngine.validateConditions([{ field: 'x', op: 'bogus' }]); } catch (_e) { threw = true; }
 t(threw, 'invalid op is rejected by validation');

 const doc = as.doctor.run();
 t(doc.ok === true, 'doctor passes self-check');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
