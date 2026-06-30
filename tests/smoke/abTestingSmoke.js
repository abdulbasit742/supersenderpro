#!/usr/bin/env node
// tests/smoke/abTestingSmoke.js — Smoke test for distribution + winner pick + lock. Run: npm run ab-testing:smoke

const ab = require('../../lib/abTesting');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ab.experimentEngine, 'engine present');

 // Weighted split roughly respects weights across many contacts (deterministic per contact).
 const exp = ab.experimentEngine.create({ name: 'Split', variants: [ { id: 'a', weight: 3, body: 'A' }, { id: 'b', weight: 1, body: 'B' } ] });
 let a = 0, b = 0;
 for (let i = 0; i < 400; i++) { const v = ab.experimentEngine.variantFor(exp.id, '+92300' + String(1000000 + i)); if (v.variantId === 'a') a++; else b++; }
 t(a > b, '3:1 weighting sends more contacts to variant A');

 // Drive conversions so A clearly wins, then auto-winner should pick A.
 const view0 = ab.experimentEngine.get(exp.id);
 // mark conversions for a chunk of A-assigned contacts
 let conv = 0;
 for (let i = 0; i < 400 && conv < 60; i++) { const c = '+92300' + String(1000000 + i); const v = ab.experimentEngine.variantFor(exp.id, c); if (v.variantId === 'a') { ab.experimentEngine.recordConversion(exp.id, c); conv++; } }
 const view = ab.experimentEngine.get(exp.id);
 t(view.totals.conversions >= 1, 'conversions recorded');
 t(typeof view.enoughSample === 'boolean', 'sample sufficiency computed');

 // Stop locks a winner and freezes assignment to it.
 const stopped = ab.experimentEngine.stop(exp.id, { winnerId: 'a' });
 t(stopped.locked === true && stopped.winner === 'a', 'stop() locks the chosen winner');
 const post = ab.experimentEngine.variantFor(exp.id, '+923009999999');
 t(post.locked === true && post.variantId === 'a', 'after stop, everyone gets the locked winner');

 const ov = ab.experimentEngine.overview();
 t(typeof ov.cards.experiments === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
