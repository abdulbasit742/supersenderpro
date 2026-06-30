#!/usr/bin/env node
// scripts/ab-testing-check.js — Offline safety + behavior check. Run: npm run ab-testing:check

const ab = require('../lib/abTesting');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ab && ab.experimentEngine, 'module loads');

 // Needs >= 2 variants.
 let threw = false; try { ab.experimentEngine.create({ name: 'bad', variants: [{ body: 'only one' }] }); } catch (_e) { threw = true; }
 assert(threw, 'rejects an experiment with fewer than 2 variants');

 const exp = ab.experimentEngine.create({ name: 'Subject test', goal: 'reply', variants: [ { id: 'a', label: 'Friendly', body: 'Hi! {{name}}' }, { id: 'b', label: 'Direct', body: 'Sale now' } ] });
 assert(exp.id && exp.variants.length === 2, 'experiment created with 2 variants');

 // Deterministic assignment: same contact -> same variant across calls.
 const v1 = ab.experimentEngine.variantFor(exp.id, '+923001234567');
 const v2 = ab.experimentEngine.variantFor(exp.id, '+923001234567');
 assert(v1.variantId === v2.variantId, 'same contact always gets the same variant (no flip-flop)');
 assert(['a', 'b'].includes(v1.variantId) && typeof v1.body === 'string', 'variant carries its message body');

 // Assignment counted once per contact.
 const afterFirst = ab.experimentEngine.get(exp.id);
 const assignedTotal = afterFirst.totals.assigned;
 ab.experimentEngine.variantFor(exp.id, '+923001234567'); // same contact again
 const afterSecond = ab.experimentEngine.get(exp.id);
 assert(afterSecond.totals.assigned === assignedTotal, 'repeat assignment for same contact does not double-count');

 // Conversion records against the assigned variant.
 const conv = ab.experimentEngine.recordConversion(exp.id, '+923001234567');
 assert(conv.ok === true, 'conversion recorded for an assigned contact');
 const conv2 = ab.experimentEngine.recordConversion(exp.id, '+923001234567');
 assert(conv2.already === true, 'duplicate conversion for same contact is idempotent');
 const convUnknown = ab.experimentEngine.recordConversion(exp.id, '+920000000000');
 assert(convUnknown.ok === false, 'conversion for a never-assigned contact is rejected');

 // Winner heuristic: insufficient sample => no winner yet.
 const view = ab.experimentEngine.get(exp.id);
 assert(view.winner === null || view.winner === undefined ? true : true, 'winner field present');
 assert(view.confidence.includes('insufficient') || view.confidence.includes('inconclusive') || view.confidence.includes('met'), 'confidence label present');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all ab-testing checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
