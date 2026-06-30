#!/usr/bin/env node
// scripts/sender-health-check.js — Offline safety + behavior check. Run: npm run sender-health:check

const sh = require('../lib/senderHealth');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(sh && sh.governor, 'module loads');

 const NUM = '+923009000001';
 // Fresh number: daily cap should equal warmupStartCap on day 0.
 const rec = sh.numberRegistry.get(NUM);
 const cap0 = sh.governor.dailyCapFor(rec, Date.now());
 assert(cap0 === sh.config.warmupStartCap, 'fresh number daily cap = warmup start cap');

 // First gate allows + returns a delay in range.
 const g = sh.governor.gate(NUM);
 assert(g.decision === 'allow', 'first send is allowed');
 assert(g.delayMs >= sh.config.minDelayMs && g.delayMs <= sh.config.maxDelayMs, 'recommended delay within jitter window');

 // Exhaust the daily cap -> hold.
 for (let i = 0; i < sh.config.warmupStartCap; i++) sh.numberRegistry.recordSend(NUM, Date.now());
 const g2 = sh.governor.gate(NUM);
 assert(g2.decision === 'hold' && /cap/.test(g2.reason), 'daily cap reached -> hold');

 // Health score: enough blocks push it below deny threshold -> deny.
 const BAD = '+923009000002';
 sh.numberRegistry.get(BAD);
 // Tank the stored score directly via repeated complaints recording + manual score is via recovery model;
 // simulate by setting status to suspended which must deny.
 sh.numberRegistry.setStatus(BAD, 'suspended');
 const g3 = sh.governor.gate(BAD);
 assert(g3.decision === 'deny', 'suspended number is denied');

 // Spintax expands + counts.
 const out = sh.spintax.spin('Hello {there|friend}, {welcome|hi}!', 42);
 assert(/Hello (there|friend), (welcome|hi)!/.test(out), 'spintax expands to one variation');
 assert(sh.spintax.count('{a|b}{c|d|e}') === 6, 'spintax counts 2x3 = 6 variations');

 // gateAndRecord increments the counter when allowed.
 const NUM3 = '+923009000003';
 const before = sh.numberRegistry.get(NUM3).daySent;
 sh.governor.gateAndRecord(NUM3);
 const after = sh.numberRegistry.get(NUM3).daySent;
 assert(after === before + 1, 'gateAndRecord accounts an allowed send');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all sender-health checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
