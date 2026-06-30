'use strict';
/**
 * lib/healthCheck/probes/datastore.js - health probes for the data layer + Redis.
 * These are the dependencies most likely to take the app down, so the health check should
 * reflect them. Both reuse the modules' own ping/healthz so we don't duplicate connection logic.
 *
 * db: 'down' if the repository can't ping (postgres unreachable). json driver is always ok.
 * redis: 'ok' when reachable; 'degraded' (NOT down) when unconfigured/unreachable, because the
 *   app has an in-memory fallback - it still serves, just isn't multi-instance safe.
 */
async function dbProbe() {
  try {
    const repo = require('../../db');
    const r = await repo.ping();
    return { status: r && r.ok ? 'ok' : 'down', driver: r && r.driver };
  } catch (e) {
    return { status: 'down', error: e.message };
  }
}

async function redisProbe() {
  try {
    const redis = require('../../redis');
    const h = await redis.healthz();
    if (h.mode === 'memory') return { status: 'degraded', mode: 'memory', note: 'REDIS_URL unset - single-instance fallback' };
    return { status: h.ok ? 'ok' : 'degraded', mode: h.mode, error: h.error };
  } catch (e) {
    return { status: 'degraded', error: e.message };
  }
}

module.exports = { dbProbe, redisProbe };
