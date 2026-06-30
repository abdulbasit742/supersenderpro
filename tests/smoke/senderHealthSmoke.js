#!/usr/bin/env node
// tests/smoke/senderHealthSmoke.js — Smoke test for warmup ramp + hourly cap + spintax. Run: npm run sender-health:smoke

const sh = require('../../lib/senderHealth');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!sh.governor, 'governor present');

 // Warmup ramp grows with simulated age.
 const NUM = '+923009100001';
 const rec = sh.numberRegistry.get(NUM);
 const today = Date.now();
 const in5days = today + 5 * 86400000;
 const capToday = sh.governor.dailyCapFor(rec, today);
 const capLater = sh.governor.dailyCapFor(rec, in5days);
 t(capLater > capToday, 'daily cap ramps up as the number ages');
 t(capLater <= sh.config.dailyCapMax, 'ramped cap never exceeds the max');

 // Hourly cap holds even if daily room remains.
 const NUM2 = '+923009100002';
 for (let i = 0; i < sh.config.hourlyCap; i++) sh.numberRegistry.recordSend(NUM2, today);
 const g = sh.governor.gate(NUM2, today);
 t(g.decision === 'hold' && /hourly/.test(g.reason), 'hourly cap triggers a hold');

 // Masking: overview never exposes the full number.
 const ov = sh.governor.overview();
 t(ov.numbers.every((n) => String(n.masked).indexOf('9100001') === -1), 'numbers are masked in overview');
 t(typeof ov.cards.numbers === 'number', 'overview returns card counts');

 // Deterministic spintax with a seed is reproducible.
 const a = sh.spintax.spin('{x|y|z} test', 7);
 const b = sh.spintax.spin('{x|y|z} test', 7);
 t(a === b, 'seeded spintax is deterministic');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
