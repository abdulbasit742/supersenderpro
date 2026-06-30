'use strict';
/**
 * Offline smoke for #94 Back-in-Stock Waitlist. No network, no model.
 * Run: node tests/smoke/waitlistSmoke.js
 */
process.env.LLM_HUB_DRY_RUN = 'true'; // force template, no Ollama call
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// isolate data dir
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-'));
process.chdir(tmp);

const wl = require(path.join(__dirname, '..', '..', 'lib', 'waitlist', 'waitlistEngine'));

(async () => {
  const T = 'tenantA';

  // tenant guard
  assert.throws(() => wl.join(undefined, { productId: 'p1', contact: '+92300' }), /tenantId/);

  // join
  const a = wl.join(T, { productId: 'p1', productName: 'Red Mug', contact: '+92300', name: 'Ali' });
  assert.strictEqual(a.deduped, false);
  assert.strictEqual(a.entry.status, 'waiting');

  // dedupe same contact+product
  const b = wl.join(T, { productId: 'p1', contact: '+92300' });
  assert.strictEqual(b.deduped, true);
  assert.strictEqual(b.entry.requests, 2);

  // second person, same product
  wl.join(T, { productId: 'p1', contact: '+92311' });

  // stats
  const s = wl.stats(T);
  const p1 = s.waiting.find((w) => w.productId === 'p1');
  assert.strictEqual(p1.waiting, 2);

  // restock notify with a sink that records deliveries
  const sent = [];
  const out = await wl.notifyRestock(T, { productId: 'p1', sink: async (c, m) => { sent.push([c, m]); } });
  assert.strictEqual(out.targeted, 2);
  assert.strictEqual(sent.length, 2);
  assert.ok(sent[0][1].includes('Red Mug'), 'message mentions product name');

  // after notify, no one waiting
  assert.strictEqual(wl.list(T, { status: 'waiting' }).length, 0);
  assert.strictEqual(wl.list(T, { status: 'notified' }).length, 2);

  // remove
  const r = wl.remove(T, { productId: 'p1', contact: '+92300' });
  assert.strictEqual(r.removed, 1);

  console.log('OK #94 waitlist smoke passed');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
