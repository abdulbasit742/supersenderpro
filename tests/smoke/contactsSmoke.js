#!/usr/bin/env node
// tests/smoke/contactsSmoke.js — Smoke test for normalization + rule engine. Run: npm run contacts:smoke

const cb = require('../../lib/contacts');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!cb.segmentEngine, 'engine present');

 t(cb.normalize.normalizePhone('0300-1234567') === '+923001234567', 'dashes stripped + PK normalized');
 t(cb.normalize.normalizePhone('00923001234567') === '+923001234567', '0092 prefix normalized');
 t(cb.normalize.normalizeEmail('  A@B.COM ') === 'a@b.com', 'email lowercased + trimmed');

 const c = cb.contactStore.upsert({ email: 'lead@shop.pk', name: 'Sara', fields: { city: 'Lahore' }, tags: ['lead'] });
 t(c.contact.fields.city === 'Lahore', 'custom field stored');

 // AND/OR rule tree.
 const rule = { any: [ { field: 'field:city', op: 'eq', value: 'Lahore' }, { field: 'tag', op: 'contains', value: 'vip' } ] };
 const r = cb.segmentEngine.evaluate(rule);
 t(r.total >= 1, 'OR rule matches city=Lahore');

 const notMatch = cb.segmentEngine.matches({ tags: [], fields: { city: 'Karachi' }, status: 'active', consent: 'unknown' }, rule);
 t(notMatch === false, 'non-matching contact correctly excluded');

 const saved = cb.segmentEngine.saveSegment({ name: 'Lahore or VIP', rule });
 t(saved.id && cb.segmentEngine.getSegment(saved.id), 'segment saves + reloads');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
