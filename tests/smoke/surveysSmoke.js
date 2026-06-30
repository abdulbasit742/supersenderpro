#!/usr/bin/env node
// tests/smoke/surveysSmoke.js — Smoke test for NPS scoring + window expiry + parsing. Run: npm run surveys:smoke

const sv = require('../../lib/surveys');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!sv.surveyEngine, 'engine present');

 // NPS math: 3 promoters, 1 passive, 1 detractor of 5 => (60-20)=40.
 const score = sv.scoring.nps([10, 9, 9, 7, 3]);
 t(score.score === 40 && score.promoters === 3 && score.detractors === 1, 'NPS computed correctly');

 // Parser pulls the first in-range integer, ignores junk.
 t(sv.responseParser.parse({ type: 'nps' }, 'maybe 8 today').value === 8, 'NPS parser extracts 8');
 t(sv.responseParser.parse({ type: 'csat' }, '6').ok === false, 'CSAT rejects 6 (out of 1-5)');

 // Response window expiry: a reply after the window does not count.
 const s = sv.surveyEngine.create({ name: 'Expiry', type: 'nps' });
 const past = Date.now() - (sv.config.responseWindowHours + 1) * 3600 * 1000;
 await sv.surveyEngine.send(s.id, 'late', past);
 const late = sv.surveyEngine.capture({ contact: 'late', text: '10' }, Date.now());
 t(late.matched === false && /window/.test(late.reason), 'reply after the window is rejected');

 // text survey accepts any non-empty reply.
 const txt = sv.surveyEngine.create({ name: 'Open feedback', type: 'text' });
 await sv.surveyEngine.send(txt.id, 'fb');
 const r = sv.surveyEngine.capture({ contact: 'fb', text: 'love it, faster delivery please' });
 t(r.accepted && typeof r.value === 'string', 'text survey accepts free-text');

 const ov = sv.surveyEngine.overview();
 t(typeof ov.cards.surveys === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
