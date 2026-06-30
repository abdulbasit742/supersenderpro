#!/usr/bin/env node
// scripts/surveys-check.js — Offline safety + behavior check. Run: npm run surveys:check

const sv = require('../lib/surveys');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(sv && sv.surveyEngine, 'module loads');
 assert(sv.config.effective.liveSend === false, 'survey send is draft-only by default (safe)');

 // Create an NPS survey + send (drafted) which opens an ask window.
 const nps = sv.surveyEngine.create({ name: 'Post-purchase NPS', type: 'nps' });
 const c = '+923001234567';
 const sent = await sv.surveyEngine.send(nps.id, c);
 assert(sent.sent === false && sent.draft === true, 'survey send is drafted, not sent');
 assert(sent.to.indexOf('1234567') === -1, 'contact masked in send result');

 // Capture an in-range reply -> recorded.
 const cap = sv.surveyEngine.capture({ contact: c, text: 'I would give it a 9!' });
 assert(cap.matched && cap.accepted && cap.value === 9, 'in-range NPS reply captured as 9');

 // Out-of-range reply is rejected (after re-sending to open a new ask).
 await sv.surveyEngine.send(nps.id, c);
 const bad = sv.surveyEngine.capture({ contact: c, text: '50' });
 assert(bad.matched && bad.accepted === false && /range/.test(bad.reason), 'out-of-range NPS reply rejected');

 // No open ask -> not matched.
 const none = sv.surveyEngine.capture({ contact: '+923009998877', text: '10' });
 assert(none.matched === false, 'reply with no open ask is not matched');

 // CSAT scoring.
 const csat = sv.surveyEngine.create({ name: 'CSAT', type: 'csat' });
 for (const [contact, val] of [['a', '5'], ['b', '4'], ['c', '2']]) { await sv.surveyEngine.send(csat.id, contact); sv.surveyEngine.capture({ contact, text: val }); }
 const csatRes = sv.surveyEngine.results(csat.id);
 assert(csatRes.responses === 3 && csatRes.csatPct === 67, 'CSAT% = 2 of 3 satisfied = 67%');

 // Poll parsing by number + label.
 const poll = sv.surveyEngine.create({ name: 'Pick', type: 'poll', options: ['Red', 'Blue'] });
 await sv.surveyEngine.send(poll.id, 'p1'); const pr = sv.surveyEngine.capture({ contact: 'p1', text: '2' });
 assert(pr.accepted && pr.value === 'Blue', 'poll reply by option number maps to label');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all surveys checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
