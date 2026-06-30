#!/usr/bin/env node
// scripts/contacts-check.js — Offline safety + behavior check. Run: npm run contacts:check

const cb = require('../lib/contacts');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(cb && cb.contactStore, 'module loads');
 assert(cb.config.excludeOptedOutFromSegments === true, 'opted-out excluded from segments by default (safe)');

 // Pakistan number normalization + dedupe.
 const a = cb.contactStore.upsert({ phone: '03001234567', name: 'Ali' });
 assert(a.contact.phone === '+923001234567', '03xx number normalized to +923xx');
 const b = cb.contactStore.upsert({ phone: '+92 300 1234567', tags: ['vip'] });
 assert(b.created === false && b.contact.id === a.contact.id, 'same number in different format merges (no duplicate)');
 assert(b.contact.tags.includes('vip'), 'merge adds tags');

 // Segment rule (no eval): tag = vip AND consent != opted_out.
 const rule = { all: [{ field: 'tag', op: 'contains', value: 'vip' }] };
 const seg = cb.segmentEngine.evaluate(rule);
 assert(seg.total >= 1, 'segment matches the vip contact');
 assert(seg.sample[0].phoneMasked.indexOf('1234567') === -1, 'phone masked in segment sample');

 // Consent gate: opt out, then the contact drops from the segment.
 cb.contactStore.setConsent(a.contact.id, 'opted_out');
 const seg2 = cb.segmentEngine.evaluate(rule);
 assert(seg2.total === 0, 'opted-out contact excluded from segment');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all contacts checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
