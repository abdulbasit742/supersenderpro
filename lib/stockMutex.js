// stockMutex.js — per-key in-process mutex for stock updates.
//
// Prevents concurrent modifications of the SAME key (e.g. a product/store) within a single Node
// process. Unrelated keys run in parallel, so one slow update no longer blocks every other order.
//
// ⚠️  IMPORTANT — SINGLE PROCESS ONLY.
// This lock lives in process memory. If you run more than one instance/replica (Docker, k8s,
// `fly scale`, PM2 cluster mode, etc.) each process has its OWN lock and two instances CAN still
// race the same stock → oversell. For multi-instance deployments replace this with a distributed
// lock (e.g. Redis SET NX PX / Redlock). Keep the same lock()/unlock()/runWithLock() API so callers
// don't change.

class KeyedMutex {
  constructor() {
    // key -> { locked: boolean, waiters: Array<fn> }
    this._locks = new Map();
  }

  _entry(key) {
    let e = this._locks.get(key);
    if (!e) { e = { locked: false, waiters: [] }; this._locks.set(key, e); }
    return e;
  }

  /**
   * Acquire the lock for `key`. Resolves once the lock is held.
   * @param {string} key  Defaults to a shared 'default' key (legacy global-lock behaviour).
   */
  lock(key = 'default') {
    const e = this._entry(key);
    if (!e.locked) {
      e.locked = true;
      return Promise.resolve();
    }
    return new Promise(resolve => e.waiters.push(resolve));
  }

  /**
   * Release the lock for `key`. Hands off to the next waiter if any, otherwise frees the key.
   */
  unlock(key = 'default') {
    const e = this._locks.get(key);
    if (!e) return;
    if (e.waiters.length > 0) {
      const next = e.waiters.shift();
      next();
    } else {
      e.locked = false;
      // Drop empty entries so the map doesn't grow unbounded across many keys.
      if (!e.locked && e.waiters.length === 0) this._locks.delete(key);
    }
  }

  /**
   * Convenience wrapper: run `fn` while holding the lock for `key`, always releasing afterwards
   * even if `fn` throws. Returns whatever `fn` returns.
   */
  async runWithLock(key, fn) {
    if (typeof key === 'function') { fn = key; key = 'default'; }
    await this.lock(key);
    try {
      return await fn();
    } finally {
      this.unlock(key);
    }
  }
}

module.exports = new KeyedMutex();
