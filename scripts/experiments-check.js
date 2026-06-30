#!/usr/bin/env node
// scripts/experiments-check.js — Offline safety + behavior check. Run: npm run experiments:check

const ex = require('../lib/experiments');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ex && ex.experimentEngine, 'module loads');

 // Need >= 2 variants.
 let threw = false; try { ex.experimentEngine.create({ name: 'bad', variants: [{ message: 'x' }] }); } catch (_e) { threw = true; }
 assert(threw, 'rejects an experiment with fewer than 2 variants');

 const exp = ex.experimentEngine.create({ name: 'Subject test', metric: 'click', variants: [
 { id: 'a', label: 'Control', message: 'Hi! 20% off today.', isControl: true, weight: 1 },
 { id: 'b', label: 'Emoji', message: 'Hi! 🎉 20% off today.', weight: 1 },
 ] });
 assert(exp.variants.length === 2 && exp.variants.find((v) => v.isControl).id === 'a', 'experiment created, first variant is control');

 // Sticky assignment: same contact -> same variant across calls.
 const c = '+923001234567';
 const a1 = ex.experimentEngine.assignFor(exp.id, c, { recordSend: false });
 const a2 = ex.experimentEngine.assignFor(exp.id, c, { recordSend: false });
 assert(a1.variantId === a2.variantId, 'assignment is sticky for the same contact');
 assert(a1.message.length > 0, 'assignment returns the variant message to send');

 // Record sends + conversions, then results compute lift + significance.
 for (let i = 0; i < 200; i++) ex.experimentEngine.assignFor(exp.id, '+92300' + i, { recordSend: true });
 // Force some conversions on whichever variants those contacts landed in.
 let converted = 0;
 for (let i = 0; i < 200 && converted < 60; i++) { const r = ex.experimentEngine.recordConversion(exp.id, '+92300' + i); if (r.recorded) converted += 1; }
 const res = ex.experimentEngine.results(exp.id);
 assert(res.variants.length === 2 && typeof res.variants[1].liftVsControlPct === 'number', 'results include lift vs control');
 assert(res.variants.every((v) => typeof v.conversionRate === 'number'), 'results include conversion rate per variant');

 // Declare a winner -> experiment stops + always serves the winner.
 ex.experimentEngine.declareWinner(exp.id, 'b');
 const after = ex.experimentEngine.assignFor(exp.id, '+923009999999', { recordSend: false });
 assert(after.variantId === 'b' && after.status === 'stopped', 'after winner declared, all contacts get the winner');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all experiments checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
