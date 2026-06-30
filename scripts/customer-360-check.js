#!/usr/bin/env node
// scripts/customer-360-check.js — Offline safety + behavior check. Run: npm run customer-360:check

const c3 = require('../lib/customer360');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(c3 && c3.timeline, 'module loads');

 const NUM = '+923001234567';
 // Track a few events.
 c3.timeline.track({ contact: NUM, type: 'signup' });
 c3.timeline.track({ contact: NUM, type: 'message_in' });
 c3.timeline.track({ contact: NUM, type: 'click', meta: { campaign: 'eid' } });
 c3.timeline.track({ contact: NUM, type: 'payment', meta: { amount: 2000 } });

 // Message bodies + PII must be dropped/redacted from meta.
 const ev = c3.timeline.track({ contact: NUM, type: 'message_in', meta: { body: 'secret order details', phone: '+923009998877' } });
 assert(ev.meta.body === undefined, 'message body dropped from event meta');
 assert(ev.meta.phone === 'redacted', 'phone-like meta value redacted');

 // Timeline reads back, newest first, masked contact.
 const tl = c3.timeline.events(NUM, { limit: 10 });
 assert(tl.length >= 5 && tl[0].type === 'message_in', 'timeline returns events newest-first');

 // Profile rollup.
 const p = c3.profile.build(NUM);
 assert(p.contactMasked.indexOf('1234567') === -1, 'profile masks the contact');
 assert(p.payments === 1 && p.clicks === 1, 'profile counts by type');
 assert(p.firstSeen && p.lastSeen, 'profile has first/last seen');
 assert(p.engagement.score > 0 && ['hot', 'warm', 'cold'].includes(p.engagement.rating), 'engagement score + rating computed');

 // Opt-out caps the score low + derived consent reflects it.
 c3.timeline.track({ contact: NUM, type: 'opt_out' });
 const p2 = c3.profile.build(NUM);
 assert(p2.engagement.score <= 5, 'opt-out caps engagement score low');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all customer-360 checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
