'use strict';
/**
 * tests/smoke/redisSmoke.js - exercises lock/rateLimit/cache in MEMORY mode (no Redis needed).
 * If REDIS_URL is set, the same code path runs against real Redis. Usage: node tests/smoke/redisSmoke.js
 */
const assert = require('assert');
const { lock, rateLimit, cache, healthz } = require('../../lib/redis');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('healthz returns a mode', async () => { const h = await healthz(); assert.ok(h.mode === 'memory' || h.mode === 'redis'); });
  await t('lock is exclusive', async () => {
    const k = 'smoke_' + Date.now();
    const a = await lock.acquire(k, 5000);
    assert.ok(a, 'first acquire should succeed');
    const b = await lock.acquire(k, 5000);
    assert.strictEqual(b, null, 'second acquire must fail while held');
    assert.strictEqual(await lock.release(k, a), true);
    const c = await lock.acquire(k, 5000);
    assert.ok(c, 'acquire after release should succeed');
    await lock.release(k, c);
  });
  await t('release with wrong token is rejected', async () => {
    const k = 'smoke_tok_' + Date.now();
    const tok = await lock.acquire(k, 5000);
    assert.strictEqual(await lock.release(k, 'wrong-token'), false);
    await lock.release(k, tok);
  });
  await t('withLock runs and releases', async () => {
    const k = 'smoke_wl_' + Date.now();
    let ran = false;
    await lock.withLock(k, async () => { ran = true; });
    assert.ok(ran);
    const after = await lock.acquire(k, 1000);
    assert.ok(after, 'lock should be free after withLock');
    await lock.release(k, after);
  });
  await t('rate limit blocks over the cap', async () => {
    const k = 'smoke_rl_' + Date.now();
    let lastAllowed = true;
    for (let i = 0; i < 6; i++) { const r = await rateLimit.hit(k, 5, 60); lastAllowed = r.allowed; }
    assert.strictEqual(lastAllowed, false, '6th hit over limit 5 must be blocked');
  });
  await t('cache set/get/del round-trip', async () => {
    const k = 'smoke_cache_' + Date.now();
    await cache.set(k, { a: 1 }, 30);
    assert.deepStrictEqual(await cache.get(k), { a: 1 });
    await cache.del(k);
    assert.strictEqual(await cache.get(k), null);
  });
  console.log('\n' + passed + ' checks passed.');
})();
