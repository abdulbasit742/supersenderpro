'use strict';
/**
 * Offline smoke test for the broadcast throttle queue.
 * No model, no network, no real sends. Just verifies pacing + caps + gates.
 * Run:  node tests/smoke/broadcastThrottleSmoke.js
 */
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

// isolate data dir so we don't clobber real queue
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'throttle-'));
process.chdir(tmp);

const tq = require(path.join(__dirname, '..', '..', 'lib', 'broadcastThrottle', 'throttleQueue'));

(async () => {
  tq.reset();

  // 1. enqueue with consent gate -> half blocked
  const consented = new Set(['+10000000001', '+10000000003', '+10000000005']);
  const hooks = { isConsented: (p) => consented.has(p) };
  const recips = ['+10000000001', '+10000000002', '+10000000003', '+10000000004', '+10000000005'];
  const enq = tq.enqueue(recips, { template: 'promo' }, hooks);
  assert.strictEqual(enq.queued, 3, 'only consented recipients queued');
  assert.strictEqual(enq.skipped, 2, 'non-consented skipped');
  console.log('ok: consent gate at enqueue ->', enq);

  // 2. dispatch with tiny per-minute cap -> only cap-many released
  const r1 = await tq.dispatch({ dryRun: true, caps: { perMinute: 2, perHour: 100, perDay: 1000 } }, {});
  assert.strictEqual(r1.dispatched, 2, 'per-minute cap enforced');
  console.log('ok: per-minute cap ->', r1);

  // 3. next tick releases the remainder within hour/day budget
  const r2 = await tq.dispatch({ dryRun: true, caps: { perMinute: 5, perHour: 100, perDay: 1000 } }, {});
  assert.strictEqual(r2.dispatched, 1, 'remaining job released');
  console.log('ok: drain remainder ->', r2);

  // 4. queue now empty
  const r3 = await tq.dispatch({ dryRun: true, caps: { perMinute: 5 } }, {});
  assert.strictEqual(r3.dispatched, 0, 'nothing left to send');

  // 5. send-window defer
  tq.reset();
  tq.enqueue(['+1999'], { template: 't' }, {});
  const rDefer = await tq.dispatch({ dryRun: true }, { inSendWindow: () => false });
  assert.strictEqual(rDefer.dispatched, 0, 'deferred outside send window');
  assert.strictEqual(rDefer.deferred, 1, 'one job deferred');
  console.log('ok: send-window defer ->', rDefer);

  // 6. number-health hold
  tq.reset();
  tq.enqueue(['+1888'], { template: 't' }, {});
  const rHold = await tq.dispatch({ dryRun: true }, { numberHealthOk: () => false });
  assert.strictEqual(rHold.dispatched, 0, 'held on bad number health');
  console.log('ok: number-health hold ->', rHold);

  console.log('\nALL BROADCAST-THROTTLE SMOKE TESTS PASSED');
})().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(1);
});
