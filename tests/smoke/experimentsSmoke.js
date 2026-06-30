#!/usr/bin/env node
// tests/smoke/experimentsSmoke.js — Smoke test for weighting + stats + winner gating. Run: npm run experiments:smoke

const ex = require('../../lib/experiments');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ex.experimentEngine, 'engine present');

 // Weighted assignment roughly honors weights across many contacts.
 const exp = ex.experimentEngine.create({ name: 'Weighted', variants: [
 { id: 'a', message: 'A', isControl: true, weight: 3 },
 { id: 'b', message: 'B', weight: 1 },
 ] });
 let aCount = 0, bCount = 0;
 for (let i = 0; i < 1000; i++) { const r = ex.experimentEngine.assignFor(exp.id, 'u' + i, { recordSend: false }); if (r.variantId === 'a') aCount++; else bCount++; }
 t(aCount > bCount, 'higher-weight variant gets more assignments (3:1)');

 // Two-proportion z-test: a big clear difference is significant; a tiny one is not.
 const big = ex.stats.zTest(200, 1000, 100, 1000);
 t(big.significant === true, 'large conversion gap is significant');
 const small = ex.stats.zTest(101, 1000, 100, 1000);
 t(small.significant === false, 'tiny conversion gap is not significant');

 // Lift math.
 t(ex.stats.lift(0.12, 0.10) === 20, 'lift computes +20% correctly');

 // Winner gating: no winner recommended below min sample.
 const small2 = ex.experimentEngine.create({ name: 'Tiny', variants: [{ id: 'a', message: 'A', isControl: true }, { id: 'b', message: 'B' }] });
 ex.experimentEngine.assignFor(small2.id, 'x1'); ex.experimentEngine.recordConversion(small2.id, 'x1');
 const r = ex.experimentEngine.results(small2.id);
 t(r.recommendedWinner === null, 'no winner recommended before reaching min sample');

 const ov = ex.experimentEngine.overview();
 t(typeof ov.cards.experiments === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
