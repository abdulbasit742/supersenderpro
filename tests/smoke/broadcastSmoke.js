// tests/smoke/broadcastSmoke.js — end-to-end smoke for broadcast dept
'use strict';

const assert = require('assert');
const broadcast = require('../../lib/broadcast');

const T = '__smoke_broadcast__';

// 1) create draft campaign with explicit recipients
const c = broadcast.createCampaign(T, {
  name: 'Smoke blast',
  message: 'Hello {{name}}',
  recipients: [
    { phone: '923001112233', name: 'Ali' },
    { phone: '923004445566', name: 'Sara' },
    { phone: '923001112233', name: 'Dup' }, // dedupe target
  ],
});
assert(c.id, 'campaign created');
assert.strictEqual(c.stats.total, 2, 'deduped to 2 recipients');
assert.strictEqual(c.state, 'draft', 'starts as draft');

// 2) dispatch in draft-safe mode → all draft, none sent
const d = broadcast.dispatch(T, c.id);
assert.strictEqual(d.stats.sent, 0, 'no live sends in draft-safe mode');
assert.strictEqual(d.stats.draft, 2, 'both recorded as draft');

// 3) tenant guard
let threw = false;
try { broadcast.list(); } catch (_) { threw = true; }
assert(threw, 'list throws without tenantId');

// 4) doctor
const dr = broadcast.doctor.check();
assert(dr.ok, 'doctor passes');

console.log('broadcast smoke OK');
