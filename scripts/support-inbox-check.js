#!/usr/bin/env node
// scripts/support-inbox-check.js — Offline safety + behavior check. Run: npm run support-inbox:check

const si = require('../lib/supportInbox');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(si && si.ticketEngine, 'module loads');
 assert(si.config.effective.liveReplies === false, 'replies are draft-only by default (safe)');

 const tri = si.autoTriage.triage('I want a refund on my invoice');
 assert(tri.category === 'billing' && tri.priority === 'high', 'auto-triage routes billing as high priority');

 const opened = si.ticketEngine.openFromMessage({ contact: '+923001234567', name: 'Ali', text: 'urgent: app is down', channel: 'whatsapp' });
 assert(opened.ticket && opened.ticket.number.startsWith('TKT-'), 'ticket opens with a number');
 assert(opened.ticket.priority === 'urgent', 'urgent keyword sets urgent priority');
 assert(opened.ticket.contactMasked.indexOf('1234567') === -1, 'contact is masked in the view');

 const again = si.ticketEngine.openFromMessage({ contact: '+923001234567', text: 'still down' });
 assert(again.appended === true, 'second inbound appends to the same open ticket (no duplicate)');

 const assigned = si.ticketEngine.assign(opened.ticket.id, 'agent-1');
 assert(assigned.assignee === 'agent-1' && assigned.status === 'pending', 'assign sets agent + moves to pending');

 const replied = await si.ticketEngine.respond(opened.ticket.id, { cannedId: 'greeting', agent: 'agent-1' });
 assert(replied.reply.sent === false && replied.reply.draft === true, 'reply is drafted, not sent');
 assert(replied.ticket.firstRespondedAt !== null, 'first-response timestamp recorded');

 const resolved = si.ticketEngine.resolve(opened.ticket.id);
 assert(resolved.status === 'resolved', 'ticket resolves');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all support-inbox checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
