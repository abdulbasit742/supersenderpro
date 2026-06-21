  'use strict';

  const express = require('express');
  const router = express.Router();

  const { config, publicConfig } = require('../lib/localWorkerBridge/config');
  const tokenLib = require('../lib/localWorkerBridge/token');
  const store = require('../lib/localWorkerBridge/store');
  const heartbeat = require('../lib/localWorkerBridge/heartbeat');
  const jobQueue = require('../lib/localWorkerBridge/jobQueue');
  const { safeWorkerView } = require('../lib/localWorkerBridge/payloads');


  /* ---------------- helpers ---------------- */

  function ok(res, data) {
      return res.json({ ok: true, ...data });
  }
  function fail(res, status, message, extra) {
    return res.status(status).json({ ok: false, error: message, ...(extra || {}) });
  }

  /** Extract a presented raw token from header or body. */
  function presentedToken(req) {
      return (
        req.get('x-worker-token') ||
          (req.body && req.body.token) ||
          (req.query && req.query.token) ||
          ''
      );
  }

  /** Verify the token for a given workerId. Returns the worker or null. */
  function authWorker(req, workerId) {
      const worker = store.getWorker(workerId);
      if (!worker) return { worker: null, reason: 'not_found' };
      const raw = presentedToken(req);
      if (!tokenLib.verifyToken(raw, worker.tokenHash)) {
          return { worker: null, reason: 'bad_token' };
      }
      return { worker, reason: null };
  }

  // If the whole module is disabled, short-circuit everything.


router.use((req, res, next) => {
 if (!config.enabled) return fail(res, 503, 'local worker bridge disabled');
 next();
});

/* ---------------- status ---------------- */


router.get('/status', (req, res) => {
 const workers = store.readWorkers();
 const counts = heartbeat.summarize(workers);
 return ok(res, {
     module: 'local-worker-bridge',
     dryRun: config.dryRun,
     config: publicConfig(),
     workerCount: workers.length,
     workers: counts, // { online, stale, offline }
     jobs: jobQueue.counts(),
   inboundCount: store.listInbound(1000).length,
 });
});

/* ---------------- worker registration ---------------- */


router.post('/register', (req, res) => {
 try {
     const b = req.body || {};
     const workerId =
         (b.workerId && String(b.workerId).trim()) ||
         'wkr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);


     if (store.getWorker(workerId)) {
         return fail(res, 409, 'workerId already registered', { workerId });
     }


     // Generate token ONCE; store only the hash + a masked preview.
     const rawToken = tokenLib.generateToken();
     const tokenHash = tokenLib.hashToken(rawToken);
     const now = new Date().toISOString();

     const worker = {
       workerId,
         workerName: String(b.workerName || workerId).slice(0, 80),
         machineLabel: String(b.machineLabel || 'unknown').slice(0, 80),
         capabilities: Array.isArray(b.capabilities)
           ? b.capabilities.slice(0, 20).map((c) => String(c).slice(0, 40))
           : ['whatsapp_send_text'],
         version: b.version ? String(b.version).slice(0, 40) : null,
         registeredAt: now,
         lastSeenAt: null,
         status: 'registered',
         tokenHash,
         maskedTokenPreview: tokenLib.maskToken(rawToken),
         lastHeartbeat: null,
     };
     store.upsertWorker(worker);

     // Full token returned EXACTLY ONCE.


     return ok(res, {
      worker: safeWorkerView(worker, { status: 'registered', secondsSince: null }),
      token: rawToken,
      tokenNotice:
        'Store this token now. It is shown only once and cannot be retrieved later.',
   });
 } catch (e) {
     return fail(res, 500, 'registration failed', { detail: String(e.message || e) });
 }
});


router.get('/workers', (req, res) => {
 const workers = store.readWorkers().map((w) =>
     safeWorkerView(w, heartbeat.computeStatus(w.lastSeenAt))
 );
 return ok(res, { count: workers.length, workers });
});


router.get('/workers/:id', (req, res) => {
 const w = store.getWorker(req.params.id);
 if (!w) return fail(res, 404, 'worker not found');
 return ok(res, { worker: safeWorkerView(w, heartbeat.computeStatus(w.lastSeenAt)) });
});

router.post('/workers/:id/heartbeat', (req, res) => {
 const { worker, reason } = authWorker(req, req.params.id);
 if (!worker) {
     return reason === 'not_found'
       ? fail(res, 404, 'worker not found')
      : fail(res, 401, 'invalid worker token');
 }
 const result = heartbeat.recordHeartbeat(worker.workerId, req.body || {});
 return ok(res, { heartbeat: result });
});

router.delete('/workers/:id', (req, res) => {
 const removed = store.removeWorker(req.params.id);
 if (!removed) return fail(res, 404, 'worker not found');
 return ok(res, { removed: true, workerId: req.params.id });
});


/* ---------------- outbound jobs (dry-run) ---------------- */

router.post('/jobs', (req, res) => {
 try {
     const job = jobQueue.createJob(req.body || {});
     return ok(res, { job: jobQueue.safeJobView(job) });
 } catch (e) {
   const status = e.code === 'INVALID_TYPE' ? 400 : 500;
     return fail(res, status, e.message || 'could not create job');
 }
});

router.get('/jobs', (req, res) => {
 const jobs = jobQueue
     .listJobs({
       status: req.query.status,


          type: req.query.type,
          limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        })
      .map(jobQueue.safeJobView);
    return ok(res, { count: jobs.length, jobs, dryRun: config.dryRun });
});


// Claim requires a valid worker token (workerId in body).
router.post('/jobs/:id/claim', (req, res) => {
    const workerId = (req.body && req.body.workerId) || '';
    const { worker, reason } = authWorker(req, workerId);
    if (!worker) {
      return reason === 'not_found'
          ? fail(res, 404, 'worker not found')
          : fail(res, 401, 'invalid worker token');
    }
    try {
        const job = jobQueue.claimJob(req.params.id, worker.workerId);
        if (!job) return fail(res, 404, 'job not found');
      return ok(res, { job: jobQueue.safeJobView(job) });
    } catch (e) {
        return fail(res, 409, e.message || 'cannot claim job');
    }
});


function workerJobAction(actionFn) {
 return (req, res) => {
        const workerId = (req.body && req.body.workerId) || '';
        const { worker, reason } = authWorker(req, workerId);
        if (!worker) {
          return reason === 'not_found'
             ? fail(res, 404, 'worker not found')
             : fail(res, 401, 'invalid worker token');
        }
        const job = actionFn(req, worker);
        if (!job) return fail(res, 404, 'job not found');
        return ok(res, { job: jobQueue.safeJobView(job) });
    };
}


router.post(
    '/jobs/:id/complete',
    workerJobAction((req) => jobQueue.completeJob(req.params.id, req.body && req.body.result))
);


router.post(
 '/jobs/:id/fail',
    workerJobAction((req) => jobQueue.failJob(req.params.id, req.body && req.body.error))
);


// retry/cancel are operator actions (no worker token required).
router.post('/jobs/:id/retry', (req, res) => {
 try {
        const job = jobQueue.retryJob(req.params.id);
        if (!job) return fail(res, 404, 'job not found');
      return ok(res, { job: jobQueue.safeJobView(job) });
    } catch (e) {


     return fail(res, 409, e.message || 'cannot retry job');
 }
});


router.post('/jobs/:id/cancel', (req, res) => {
 try {
   const job = jobQueue.cancelJob(req.params.id);
     if (!job) return fail(res, 404, 'job not found');
     return ok(res, { job: jobQueue.safeJobView(job) });
 } catch (e) {
   return fail(res, 409, e.message || 'cannot cancel job');
 }
});


/* ---------------- inbound relay (safe log only) ---------------- */


router.post('/inbound', (req, res) => {
 const workerId = (req.body && req.body.workerId) || '';
 const { worker, reason } = authWorker(req, workerId);
 if (!worker) {
   return reason === 'not_found'
      ? fail(res, 404, 'worker not found')
      : fail(res, 401, 'invalid worker token');
 }
 // NOTE: we do NOT auto-reply in this phase. We only store a safe, masked log.
 const entry = store.appendInbound({ ...req.body, workerId: worker.workerId });
 return ok(res, { stored: true, entry });
});


router.get('/inbound', (req, res) => {
 const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
 const entries = store.listInbound(limit);
 return ok(res, { count: entries.length, entries });
});


module.exports = router;
