#!/usr/bin/env node
// tests/smoke/supportInboxSmoke.js — Smoke test for SLA + canned replies. Run: npm run support-inbox:smoke

const si = require('../../lib/supportInbox');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!si.ticketEngine, 'engine present');

 const rendered = si.cannedReplies.render('resolved', { name: 'Sara', ticket: 'TKT-TEST' });
 t(rendered.includes('Sara') && rendered.includes('TKT-TEST'), 'canned reply renders merge fields');

 // Build a ticket far in the past to force an SLA breach.
 const old = { createdAt: new Date(Date.now() - 5 * 864e5).toISOString(), priority: 'high', status: 'open', firstRespondedAt: null, resolvedAt: null };
 const ev = si.slaPolicy.evaluate(old);
 t(ev.firstResponse.breached === true, 'overdue ticket flags first-response SLA breach');
 t(ev.resolution.breached === true, 'overdue ticket flags resolution SLA breach');

 const future = { createdAt: new Date().toISOString(), priority: 'low', status: 'open', firstRespondedAt: null, resolvedAt: null };
 const ev2 = si.slaPolicy.evaluate(future);
 t(ev2.firstResponse.breached === false, 'fresh low-priority ticket not breached');

 const ov = si.ticketEngine.overview();
 t(typeof ov.cards.open === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
