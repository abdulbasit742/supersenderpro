'use strict';
/**
 * scripts/contacts-check.js - smoke test for Contacts + Segmentation.
 * Imports contacts (CSV + rows), builds segments (tag rule, attribute rule, recency rule),
 * and asserts resolve()/preview() return the right audiences and exclude opted-out contacts.
 * Usage: node scripts/contacts-check.js   (exit 0 = pass)
 */
const C = require('../lib/contacts');

const TID = '__check_contacts__' + Date.now().toString(36);
let failures = 0;
const assert = (cond, msg) => { if (!cond) { failures++; console.error('  FAIL: ' + msg); } else { console.log('  ok: ' + msg); } };

(async () => {
  console.log('=== contacts-check (tenant ' + TID + ') ===');

  // 1) CSV import
  const csv = ['phone,name,tags,city', '+92 300 1234567,Ali,vip;buyer,Lahore', '03011112222,Sara,buyer,Karachi', '923022223333,Usman,,Lahore'].join('\n');
  const imp = C.importCSV(TID, csv);
  assert(imp.created === 3, 'CSV imported 3 contacts (got ' + imp.created + ')');
  assert(!!C.contacts.getByPhone(TID, '923001234567'), 'phone normalized + looked up');

  // 2) attribute + tag stored
  const ali = C.contacts.getByPhone(TID, '923001234567');
  assert(ali.attributes.city === 'Lahore', 'attribute city=Lahore stored');
  assert(ali.tags.map((t) => t.toLowerCase()).includes('vip'), 'tag vip stored');

  // 3) recency + opt-out
  C.contacts.markActive(TID, '923011112222');
  C.contacts.setOptOut(TID, '923022223333', true);

  // 4) tag segment
  const segBuyers = C.segments.create(TID, { name: 'Buyers', match: 'all', rules: [{ field: 'has_tag', op: 'has_tag', value: 'buyer' }] });
  const buyers = C.segments.resolve(TID, segBuyers.id);
  assert(buyers.length === 2, 'buyers segment = 2 (Ali, Sara; Usman has no buyer tag) got ' + buyers.length);

  // 5) attribute segment
  const segLahore = C.segments.create(TID, { name: 'Lahore', match: 'all', rules: [{ field: 'attr:city', op: 'eq', value: 'Lahore' }] });
  const lhr = C.segments.resolve(TID, segLahore.id);
  assert(lhr.some((c) => c.name === 'Ali'), 'Lahore segment includes Ali');
  assert(!lhr.some((c) => c.phone === '923022223333'), 'opted-out Usman (Lahore) excluded from segment');

  // 6) recency segment
  const segActive = C.segments.create(TID, { name: 'Active 7d', match: 'all', rules: [{ field: 'lastActiveAt', op: 'active_within_days', value: 7 }] });
  const active = C.segments.resolve(TID, segActive.id);
  assert(active.some((c) => c.phone === '923011112222'), 'recently-active Sara in Active-7d segment');

  // 7) preview shape
  const pv = C.segments.preview(TID, segBuyers.id);
  assert(typeof pv.count === 'number' && Array.isArray(pv.sample), 'preview returns count + sample');

  const doc = C.doctor.run();
  assert(doc.checks.find((c) => c.name === 'segment validation works' && c.ok), 'doctor: segment validation works');

  // cleanup
  try { require('fs').rmSync(require('path').join(__dirname, '..', 'data', 'contacts', TID + '_contacts.json'), { force: true }); } catch {}
  try { require('fs').rmSync(require('path').join(__dirname, '..', 'data', 'contacts', TID + '_segments.json'), { force: true }); } catch {}

  console.log('=== ' + (failures ? 'FAILED (' + failures + ')' : 'PASSED') + ' ===');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('check crashed:', e); process.exit(1); });
