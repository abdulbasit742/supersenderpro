#!/usr/bin/env node
// scripts/drip-campaigns-check.js — Offline safety + behavior check. Run: npm run drip-campaigns:check

const dc = require('../lib/dripCampaigns');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(dc && dc.enrollmentEngine, 'module loads');
 assert(dc.config.effective.liveSends === false, 'steps are draft-only by default (safe)');

 const j = dc.journeyStore.upsert({ id: 'jny-check-welcome', name: 'Welcome', trigger: 'signup', stopOnEvent: 'payment_success', steps: [
 { waitMinutes: 0, message: 'Hi {{name}}, welcome to SuperSender!' },
 { waitMinutes: 0, message: '{{name}}, here is how to get started.' },
 ] });
 assert(j.steps.length === 2, 'journey upserts with steps');

 const ev = dc.enrollmentEngine.handleEvent({ event: 'signup', contact: '+923009998877', name: 'Bilal' });
 assert(ev.enrolled.length === 1, 'signup event enrolls the contact');

 const dup = dc.enrollmentEngine.handleEvent({ event: 'signup', contact: '+923009998877', name: 'Bilal' });
 assert(dup.enrolled.length === 0, 'duplicate signup does not double-enroll');

 const tick1 = await dc.enrollmentEngine.tick();
 assert(tick1.processed >= 1, 'tick processes due step');
 assert(tick1.sent === 0 && tick1.drafted >= 1, 'steps are drafted, not sent (safe default)');

 // stop-on-event should halt the active enrollment
 const stop = dc.enrollmentEngine.handleEvent({ event: 'payment_success', contact: '+923009998877' });
 assert(stop.stopped.length >= 1, 'stopOnEvent halts the active enrollment');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all drip-campaigns checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
