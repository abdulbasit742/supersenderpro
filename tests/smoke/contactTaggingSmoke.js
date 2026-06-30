'use strict';
/* Offline smoke test for #105 Smart Contact Tagging. Run: node tests/smoke/contactTaggingSmoke.js */
const assert = require('assert');
const tagging = require('../../lib/contactTagging/contactTagging');

const tenantId = 'smoke-tenant-105';
const now = Date.now();

(async () => {
  // VIP buyer with electronics interest
  const hist = [
    { text: 'Salam, iphone ki price kya hai?', ts: new Date(now - 2 * 86400000).toISOString() },
    { text: 'order krna hai charger bhi', ts: new Date(now - 1 * 86400000).toISOString(), amount: 60000 }
  ];
  const rec = await tagging.tagContact(tenantId, 'c1', hist, { ai: false });
  assert(rec.tags.includes('intent:buy'), 'should detect buy intent');
  assert(rec.tags.includes('interest:electronics'), 'should detect electronics');
  assert(rec.tags.includes('vip'), 'should be vip by spend');
  assert(rec.lifecycle === 'vip', 'lifecycle vip');

  // at-risk: old last contact
  const old = [{ text: 'problem hai refund chahiye', ts: new Date(now - 90 * 86400000).toISOString() }];
  const rec2 = await tagging.tagContact(tenantId, 'c2', old, { ai: false });
  assert(rec2.tags.includes('intent:support'), 'support intent');
  assert(rec2.lifecycle === 'at-risk', 'lifecycle at-risk');

  // segment + summary
  const buyers = tagging.segment(tenantId, 'vip');
  assert(buyers.length === 1, 'one vip in segment');
  const sum = tagging.summary(tenantId);
  assert(sum.total === 2, 'two contacts total');

  // tenant isolation
  let threw = false;
  try { await tagging.tagContact('', 'x', []); } catch (_) { threw = true; }
  assert(threw, 'missing tenantId should throw');

  console.log('OK #105 contactTagging smoke passed', JSON.stringify(sum.tagCounts));
})().catch(e => { console.error('SMOKE FAIL', e); process.exit(1); });
