  'use strict';

  /**
      * Local Worker Bridge — outbound job queue (JSON file).
      *
      * IMPORTANT: every job is dry-run by default. The server-side bridge NEVER
      * sends real WhatsApp messages. Jobs are just instructions a local worker may
      * claim, complete, or fail. Recipients are stored but masked in every view.
      */

  const { config } = require('./config');
  const store = require('./store');
  const { safeJobView, safePreview } = require('./payloads');

  const JOB_TYPES = [
       'whatsapp_send_text',
       'whatsapp_send_template',
       'whatsapp_send_media',
       'whatsapp_channel_post',
       'admin_alert',
       'dry_run_test',
  ];


  const STATUSES = ['pending', 'claimed', 'completed', 'failed', 'cancelled'];

  function readJobs() {
    const data = store.readJson(config.jobStorePath, { jobs: [] });
       return Array.isArray(data.jobs) ? data.jobs : [];
  }

  function writeJobs(jobs) {
       store.writeJson(config.jobStorePath, {
         jobs,
         updatedAt: new Date().toISOString(),
       });
  }

  function newId() {
    return 'job_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }


  function summarizeJob(type, payload) {
    const p = payload || {};
       switch (type) {
         case 'whatsapp_send_text':
           return safePreview(p.text || '(text)', 80);
         case 'whatsapp_send_template':


         return 'template: ' + safePreview(p.template || p.templateName || '?', 60);
        case 'whatsapp_send_media':
          return 'media: ' + safePreview(p.caption || p.mediaType || 'file', 60);
        case 'whatsapp_channel_post':
          return 'channel post: ' + safePreview(p.text || p.channel || '?', 60);
        case 'admin_alert':
          return 'alert: ' + safePreview(p.message || '?', 60);
        case 'dry_run_test':
          return 'dry-run test ping';
        default:
          return safePreview(type, 60);
    }
}

/**
   * Create an outbound job. Always dry-run unless the bridge is explicitly not in
   * dry-run mode AND the caller opts in — but the server still never sends; the
   * flag only tells the worker whether it MAY send. Default keeps it safe.
   */
function createJob(input) {
 const i = input || {};
    const type = String(i.type || '').trim();
    if (!JOB_TYPES.includes(type)) {
        const err = new Error('invalid job type: ' + type);
        err.code = 'INVALID_TYPE';
        throw err;
    }
    const now = new Date().toISOString();
    const job = {
        id: newId(),
        type,
        status: 'pending',
        // dry-run unless the whole bridge is live AND caller set dryRun=false.
        dryRun: config.dryRun ? true : i.dryRun !== false,
        to: i.to ? String(i.to) : null,
        payload: i.payload && typeof i.payload === 'object' ? i.payload : {},
        summary: summarizeJob(type, i.payload),
        attempts: 0,
        maxAttempts: config.maxJobAttempts,
        claimedBy: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
    };
    const jobs = readJobs();
    jobs.unshift(job);
    if (jobs.length > config.maxJobs) jobs.length = config.maxJobs;
    writeJobs(jobs);
    return job;
}


function listJobs(filter) {
 let jobs = readJobs();
    const f = filter || {};
    if (f.status) jobs = jobs.filter((j) => j.status === f.status);
    if (f.type) jobs = jobs.filter((j) => j.type === f.type);
    const limit = Number.isFinite(f.limit) ? f.limit : 100;


   return jobs.slice(0, limit);
}

function getJob(id) {
 return readJobs().find((j) => j.id === id) || null;
}


function mutate(id, fn) {
 const jobs = readJobs();
   const idx = jobs.findIndex((j) => j.id === id);
   if (idx === -1) return null;
   const updated = fn(jobs[idx]);
   updated.updatedAt = new Date().toISOString();
   jobs[idx] = updated;
   writeJobs(jobs);
   return updated;
}


/** Worker claims a pending job. */
function claimJob(id, workerId) {
 return mutate(id, (job) => {
     if (job.status !== 'pending') {
       const err = new Error('job not claimable (status=' + job.status + ')');
         err.code = 'NOT_CLAIMABLE';
         throw err;
     }
     job.status = 'claimed';
     job.claimedBy = workerId;
     job.attempts += 1;
     return job;
   });
}


function completeJob(id, result) {
 return mutate(id, (job) => {
     job.status = 'completed';
     job.result = result ? safePreview(JSON.stringify(result), 200) : 'ok';
     job.lastError = null;
     return job;
   });
}


function failJob(id, errorMessage) {
   return mutate(id, (job) => {
     job.status = 'failed';
     job.lastError = safePreview(errorMessage || 'unknown error', 200);
     return job;
   });
}


function retryJob(id) {
   return mutate(id, (job) => {
     if (job.status !== 'failed' && job.status !== 'cancelled') {
         const err = new Error('only failed/cancelled jobs can retry');
         err.code = 'NOT_RETRYABLE';
         throw err;
     }


      if (job.attempts >= job.maxAttempts) {
          const err = new Error('max attempts reached');
          err.code = 'MAX_ATTEMPTS';
          throw err;
      }
      job.status = 'pending';
      job.claimedBy = null;
      job.lastError = null;
      return job;
    });
}


function cancelJob(id) {
    return mutate(id, (job) => {
      if (job.status === 'completed') {
          const err = new Error('cannot cancel a completed job');
          err.code = 'NOT_CANCELLABLE';
          throw err;
      }
      job.status = 'cancelled';
      return job;
    });
}

function counts() {
    const jobs = readJobs();
    const c = { total: jobs.length };
    for (const s of STATUSES) c[s] = 0;
    for (const j of jobs) if (c[j.status] !== undefined) c[j.status] += 1;
    return c;
}

module.exports = {
    JOB_TYPES,
    STATUSES,
    createJob,
    listJobs,
    getJob,
    claimJob,
    completeJob,
    failJob,
    retryJob,
    cancelJob,
    counts,
    safeJobView,
};
