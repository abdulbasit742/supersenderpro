  'use strict';

  /**
      * Local Worker Bridge — configuration.
      *
      * All values come from env with safe defaults. All store paths are resolved
      * RELATIVE to the repo root (process.cwd()). No absolute paths are hardcoded.
      * No secrets are ever printed; only presence/masked previews are exposed.
      */

  const path = require('path');


  function bool(v, def) {
       if (v === undefined || v === null || v === '') return def;
       return String(v).trim().toLowerCase() === 'true';
  }


  function int(v, def) {
    const n = parseInt(v, 10);
       return Number.isFinite(n) ? n : def;
  }

  // Repo root — always relative, never an absolute literal.
  const ROOT = process.cwd();

  function resolveRel(p, fallback) {
    const rel = (p && String(p).trim()) || fallback;
       // Keep it inside the repo; resolve relative to cwd.
       return path.resolve(ROOT, rel);
  }

  const config = {
    enabled: bool(process.env.LOCAL_WORKER_BRIDGE_ENABLED, true),
       // Server-side bridge is dry-run by default and NEVER sends real WhatsApp.
       dryRun: bool(process.env.LOCAL_WORKER_BRIDGE_DRY_RUN, true),

       // JSON file stores (auto-created on first write).
       storePath: resolveRel(process.env.LOCAL_WORKER_STORE_PATH, 'data/local-worker-bridge.json'),
       jobStorePath: resolveRel(process.env.LOCAL_WORKER_JOB_STORE_PATH, 'data/local-worker-jobs.json'),
       inboundStorePath: resolveRel(process.env.LOCAL_WORKER_INBOUND_STORE_PATH, 'data/local-worker-inbound.json'),


       // HMAC secret for hashing worker tokens. Local-only; override in real .env.
       tokenSecret: process.env.LOCAL_WORKER_TOKEN_SECRET || 'change-me-local-only',

       // Heartbeat freshness threshold (seconds) before a worker is 'stale'.
       heartbeatStaleSeconds: int(process.env.LOCAL_WORKER_HEARTBEAT_STALE_SECONDS, 90),


    // A worker is considered fully 'offline' after 3x the stale window.
    get heartbeatOfflineSeconds() {
      return this.heartbeatStaleSeconds * 3;
    },

    // Caps to keep JSON stores bounded.
    maxInboundLog: int(process.env.LOCAL_WORKER_MAX_INBOUND, 500),
    maxJobs: int(process.env.LOCAL_WORKER_MAX_JOBS, 1000),
    maxJobAttempts: int(process.env.LOCAL_WORKER_MAX_JOB_ATTEMPTS, 5),
};

/** Safe, secret-free view of config for the status endpoint / dashboard. */
function publicConfig() {
    return {
      enabled: config.enabled,
      dryRun: config.dryRun,
      heartbeatStaleSeconds: config.heartbeatStaleSeconds,
      heartbeatOfflineSeconds: config.heartbeatOfflineSeconds,
      tokenSecretConfigured: Boolean(
         config.tokenSecret && config.tokenSecret !== 'change-me-local-only'
      ),
      storePathRel: path.relative(ROOT, config.storePath),
      jobStorePathRel: path.relative(ROOT, config.jobStorePath),
      inboundStorePathRel: path.relative(ROOT, config.inboundStorePath),
    };
}


module.exports = { config, publicConfig, ROOT };
