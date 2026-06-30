#!/usr/bin/env node
// scripts/ai-auto-reply-check.js — Offline safety + behavior check. Run: npm run ai-auto-reply:check

const ar = require('../lib/aiAutoReply');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ar && ar.responder, 'module loads');
 assert(ar.config.effective.liveSend === false, 'suggest-only by default (safe)');

 // Confident FAQ match -> drafted reply (never sent in suggest mode).
 const r1 = await ar.responder.handle({ contact: '+923001234567', text: 'what is the price of your plan?' });
 assert(r1.action === 'reply', 'confident pricing question gets an auto-reply decision');
 assert(r1.reply && r1.reply.sent === false && r1.reply.draft === true, 'reply is drafted, not sent');
 assert(r1.contactMasked.indexOf('1234567') === -1, 'contact masked in record');

 // Explicit human request -> handoff.
 const r2 = await ar.responder.handle({ contact: '+923009998877', text: 'I want to speak to a human agent' });
 assert(r2.action === 'handoff', 'explicit human request hands off');

 // Gibberish / low confidence -> handoff (during business hours) — force via tiny refNow at noon.
 const noon = new Date(); noon.setHours(12, 0, 0, 0);
 const r3 = await ar.responder.handle({ contact: '+923001112223', text: 'asdkjfh qwerty zzz', refNow: noon.getTime() });
 assert(r3.action === 'handoff' && r3.reason === 'low_confidence', 'unknown message hands off on low confidence');

 // Cooldown: immediate second message from same contact is skipped.
 const c = '+923004445556';
 const noon2 = noon.getTime();
 await ar.responder.handle({ contact: c, text: 'pricing please', refNow: noon2 });
 const again = await ar.responder.handle({ contact: c, text: 'pricing please', refNow: noon2 + 1000 });
 assert(again.action === 'skip' && again.reason === 'cooldown', 'rapid second message is skipped on cooldown');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all ai-auto-reply checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
