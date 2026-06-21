  'use strict';

  /**
      * Local Worker Bridge — heartbeat recording + freshness.
      *
      * Stores the latest heartbeat on the worker record and derives a freshness
      * status: online / stale / offline, based on configured thresholds.
      */

  const { config } = require('./config');
  const store = require('./store');
  const { safePreview } = require('./payloads');

  /** Compute freshness from a lastSeenAt ISO string. */
  function computeStatus(lastSeenAt) {
       if (!lastSeenAt) return { status: 'offline', secondsSince: null };
       const last = new Date(lastSeenAt).getTime();
       if (!Number.isFinite(last)) return { status: 'offline', secondsSince: null };
       const secondsSince = Math.max(0, Math.round((Date.now() - last) / 1000));
       let status = 'online';
       if (secondsSince > config.heartbeatOfflineSeconds) status = 'offline';
       else if (secondsSince > config.heartbeatStaleSeconds) status = 'stale';
       return { status, secondsSince };
  }

  /** Normalize an incoming heartbeat body into a safe, bounded shape. */
  function normalizeHeartbeat(body) {
       const b = body || {};
       const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
       return {
         status: safePreview(b.status || 'unknown', 40),
           uptime: num(b.uptime),
           whatsappStatus: safePreview(b.whatsappStatus || 'unknown', 40),
           activeSessions: num(b.activeSessions),
           queueDepth: num(b.queueDepth),
           memory: num(b.memory),
           warnings: Array.isArray(b.warnings)
            ? b.warnings.slice(0, 20).map((w) => safePreview(w, 120))
            : [],
           at: new Date().toISOString(),
       };
  }

  /**
   * Record a heartbeat for a worker. Returns the updated safe status, or null if
      * the worker does not exist. Token verification happens in the route layer.
      */


function recordHeartbeat(workerId, body) {
   const worker = store.getWorker(workerId);
   if (!worker) return null;
   const hb = normalizeHeartbeat(body);
   const now = new Date().toISOString();
   worker.lastHeartbeat = hb;
   worker.lastSeenAt = now;
   worker.status = computeStatus(now).status; // 'online'
   store.upsertWorker(worker);
   return { workerId, ...computeStatus(worker.lastSeenAt), lastHeartbeat: hb };
}

/** Bucket all workers into online/stale/offline counts. */
function summarize(workers) {
 const counts = { online: 0, stale: 0, offline: 0 };
   for (const w of workers) {
     const { status } = computeStatus(w.lastSeenAt);
    if (counts[status] !== undefined) counts[status] += 1;
    else counts.offline += 1;
   }
   return counts;
}


module.exports = { computeStatus, normalizeHeartbeat, recordHeartbeat, summarize };
