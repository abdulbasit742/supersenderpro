#!/usr/bin/env node
// tests/smoke/customer360Smoke.js — Smoke test for recency decay + trimming + counts. Run: npm run customer-360:smoke

const c3 = require('../../lib/customer360');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!c3.engagement, 'engagement present');

 const now = Date.now();
 // Recency decay: same event recent vs old.
 const recent = c3.engagement.score([{ type: 'click', at: new Date(now).toISOString() }], now).score;
 const old = c3.engagement.score([{ type: 'click', at: new Date(now - 60 * 864e5).toISOString() }], now).score;
 t(recent > old, 'recent activity outweighs stale activity');

 // Rating bands.
 const hot = c3.engagement.score(Array.from({ length: 6 }, () => ({ type: 'payment', at: new Date(now).toISOString() })), now);
 t(hot.rating === 'hot', 'lots of recent payments => hot');
 const cold = c3.engagement.score([{ type: 'message_out', at: new Date(now - 90 * 864e5).toISOString() }], now);
 t(cold.rating === 'cold', 'one stale outbound => cold');

 // Per-contact trimming keeps within the cap.
 const NUM = '+923009100001';
 for (let i = 0; i < c3.config.maxEventsPerContact + 25; i++) c3.timeline.track({ contact: NUM, type: 'custom' });
 t(c3.timeline.rawEvents(NUM).length === c3.config.maxEventsPerContact, 'timeline trims to the per-contact cap');

 // Profile counts + masking.
 c3.timeline.track({ contact: '+923002223334', type: 'ticket_opened' });
 const p = c3.profile.build('+923002223334');
 t(p.ticketsOpened >= 1 && p.contactMasked.indexOf('2223334') === -1, 'profile counts tickets + masks contact');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
