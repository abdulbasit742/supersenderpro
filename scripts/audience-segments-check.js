#!/usr/bin/env node
// scripts/audience-segments-check.js — Offline safety + behavior check. Run: npm run audience-segments:check

const as = require('../lib/audienceSegments');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(as && as.evaluator, 'module loads');

 // Inject a deterministic in-memory contact source (no dependence on storeCRM).
 as.contactSource.setSource(() => ([
 { contact: '+923001110001', name: 'VIP One', tags: ['vip', 'lahore'], totalSpend: 5000, lastActiveAt: new Date().toISOString() },
 { contact: '+923001110002', name: 'Cold Lead', tags: ['lead'], totalSpend: 0, lastActiveAt: new Date(Date.now() - 90 * 864e5).toISOString() },
 { contact: 'a@b.com', name: 'Spender', tags: ['vip'], totalSpend: 20000, lastActiveAt: new Date(Date.now() - 2 * 864e5).toISOString() },
 ]));

 const seg = as.segmentStore.upsert({ id: 'seg-check-vip', name: 'VIP big spenders', match: 'all', conditions: [
 { field: 'tag', op: 'has_tag', value: 'vip' },
 { field: 'totalSpend', op: 'gte', value: 5000 },
 ] });
 assert(seg.conditions.length === 2, 'segment upserts with conditions');

 const prev = await as.evaluator.preview('seg-check-vip', { sample: 5 });
 assert(prev.matchCount === 2, 'AND segment matches the two vip 5000+ spenders');
 assert(prev.sample[0].contactMasked.indexOf('1110001') === -1, 'preview masks contacts');

 const anySeg = { match: 'any', conditions: [ { field: 'tag', op: 'has_tag', value: 'lead' }, { field: 'totalSpend', op: 'gt', value: 10000 } ] };
 const anyPrev = await as.evaluator.test(anySeg);
 assert(anyPrev.matchCount === 2, 'OR segment matches lead OR >10000 spender');

 const inactive = { match: 'all', conditions: [ { field: 'lastActiveDays', op: 'gt', value: 30 } ] };
 const inactivePrev = await as.evaluator.test(inactive);
 assert(inactivePrev.matchCount === 1, 'activity rule matches the 90-day-inactive contact');

 const resolved = await as.evaluator.resolve('seg-check-vip');
 assert(resolved.recipients.length === 2 && resolved.recipients[0].contact, 'resolve returns raw recipients for sending');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all audience-segments checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
