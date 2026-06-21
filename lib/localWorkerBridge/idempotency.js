  'use strict';

  /**
      * Local Worker Bridge — idempotency keys.
      *
      * Prevents double job-creation and double-sends. A caller may pass an
      * `idempotencyKey` when creating a job; if the same key was seen before, we
      * return the existing job id instead of creating a new one. Keys are persisted
      * in a small JSON file (repo-relative) with a bounded TTL.
      */

  const path = require('path');
  const { config, ROOT } = require('./config');
  const store = require('./store');

  const KEY_PATH = path.resolve(
    ROOT,
       process.env.LOCAL_WORKER_IDEMPOTENCY_PATH || 'data/local-worker-idempotency.json'
  );


  const TTL_MS = (config.idempotencyTtlHours || 24) * 3600 * 1000;

  function readKeys() {
       const data = store.readJson(KEY_PATH, { keys: {} });
       return data && data.keys && typeof data.keys === 'object' ? data.keys : {};
  }


  function writeKeys(keys) {
    store.writeJson(KEY_PATH, { keys, updatedAt: new Date().toISOString() });
  }

  function prune(keys) {
    const t = Date.now();
       let changed = false;
       for (const k of Object.keys(keys)) {
           if (!keys[k] || (keys[k].at && t - keys[k].at > TTL_MS)) {
             delete keys[k];
               changed = true;
           }
       }
       return changed;
  }

  /** Returns the existing jobId for a key, or null if unseen. */
  function lookup(key) {
       if (!key) return null;
       const keys = readKeys();


   if (prune(keys)) writeKeys(keys);
   return keys[key] ? keys[key].jobId : null;
}


/** Record a key -> jobId mapping. */
function remember(key, jobId) {
 if (!key) return;
   const keys = readKeys();
   prune(keys);
   keys[key] = { jobId, at: Date.now() };
   writeKeys(keys);
}

module.exports = { lookup, remember };
