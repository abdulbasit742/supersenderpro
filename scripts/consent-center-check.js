#!/usr/bin/env node
// scripts/consent-center-check.js — Offline safety + behavior check. Run: npm run consent-center:check

const cc = require('../lib/consentCenter');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(cc && cc.consentEngine, 'module loads');

 const NUM = '+923001234567';

 // Unknown contact under opt-out model is allowed by default.
 const g0 = cc.consentEngine.canSend(NUM);
 assert(g0.allowed === true && g0.status === 'unknown', 'unknown contact allowed under opt-out model');

 // Inbound STOP opts the contact out + returns a confirmation, and the gate now blocks.
 const stop = cc.consentEngine.processInbound({ contact: NUM, text: 'STOP' });
 assert(stop.intent === 'opt_out' && stop.status === 'opted_out', 'STOP opts the contact out');
 assert(typeof stop.reply === 'string' && stop.reply.length > 0, 'opt-out returns a confirmation reply');
 const g1 = cc.consentEngine.canSend(NUM);
 assert(g1.allowed === false && g1.reason === 'contact opted out', 'opted-out contact is blocked by the gate');

 // Roman-Urdu opt-out works too.
 const NUM2 = '+923009998877';
 const ru = cc.consentEngine.processInbound({ contact: NUM2, text: 'band karo' });
 assert(ru.status === 'opted_out', 'Roman-Urdu band karo opts out');

 // START opts back in + gate allows.
 const start = cc.consentEngine.processInbound({ contact: NUM, text: 'START' });
 assert(start.status === 'opted_in', 'START opts the contact back in');
 assert(cc.consentEngine.canSend(NUM).allowed === true, 'opted-in contact is allowed');

 // Non-command messages do not change consent.
 const noop = cc.consentEngine.processInbound({ contact: NUM, text: 'do you have stock?' });
 assert(noop.intent === null && noop.changed === false, 'normal message does not change consent');

 // Batch filter splits allowed vs blocked.
 cc.consentEngine.setStatus('+923000000001', 'opted_out', 'manual');
 const f = cc.consentEngine.filterSendable(['+923000000001', '+923000000002']);
 assert(f.blockedCount === 1 && f.allowedCount === 1, 'filterSendable separates opted-out from sendable');

 // Audit log recorded the changes.
 const log = cc.consentEngine.log(50);
 assert(log.length >= 3 && log[0].contactMasked.indexOf('1234567') === -1, 'consent changes logged with masked contact');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all consent-center checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
