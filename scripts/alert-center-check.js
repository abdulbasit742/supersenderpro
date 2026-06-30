#!/usr/bin/env node
// scripts/alert-center-check.js — Offline safety + behavior check. Run: npm run alert-center:check

const ac = require('../lib/alertCenter');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ac && ac.alertEngine, 'module loads');
 assert(ac.config.effective.liveDelivery === false, 'owner delivery is draft-only by default (safe)');
 assert(ac.ruleStore.all().length >= 1, 'default rules seeded');

 // Default SLA rule fires (critical, owner channel drafted).
 const r = await ac.alertEngine.emit('sla.breach', { ticket: 'TKT-1', priority: 'high', ownerTarget: '+923001234567' });
 assert(r.fired.length >= 1, 'sla.breach matches the default rule and fires');
 const slaFire = r.fired.find((f) => f.ruleId === 'sla-breach');
 assert(slaFire && slaFire.severity === 'critical', 'fired alert is critical severity');
 assert(slaFire.sent === false, 'owner delivery is drafted, not sent (safe default)');

 // Throttle: an immediate identical event is throttled.
 const r2 = await ac.alertEngine.emit('sla.breach', { ticket: 'TKT-1', priority: 'high' });
 assert(r2.throttled.length >= 1 && r2.fired.length === 0, 'duplicate alert within window is throttled');

 // Custom rule with a safe condition: only fire when amount >= 1000.
 ac.ruleStore.upsert({ id: 'big-payment', name: 'Big payment', event: 'payment.succeeded', condition: { all: [{ field: 'amount', op: 'gte', value: 1000 }] }, severity: 'info', channels: ['inapp'] });
 const small = await ac.alertEngine.emit('payment.succeeded', { amount: 500, currency: 'PKR' });
 const big = await ac.alertEngine.emit('payment.succeeded', { amount: 5000, currency: 'PKR' });
 assert(!small.fired.find((f) => f.ruleId === 'big-payment'), 'condition excludes amount below threshold');
 assert(big.fired.find((f) => f.ruleId === 'big-payment'), 'condition fires for amount over threshold');

 // Feed + read.
 const feed = ac.alertEngine.feed({ limit: 10 });
 assert(feed.length >= 1, 'feed lists recorded alerts');
 const mr = ac.alertEngine.markRead(feed[0].id);
 assert(mr.read === true, 'alert can be marked read');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all alert-center checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
