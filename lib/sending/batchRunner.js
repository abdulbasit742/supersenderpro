'use strict';
/**
 * batchRunner.js — Sending Feature #5: resumable batch broadcast runner.
 *
 * Blasting 10k recipients in one loop is fragile: a crash loses your place and you can double-send.
 * This runs a broadcast as a persisted JOB — recipients are chunked into batches, progress is saved
 * after each send, and a crash/restart resumes exactly where it stopped (already-sent indices are
 * skipped). Supports pause/resume/cancel and live progress.
 *
 * Sending is injected (the guarded sender + number pool). tick() advances one batch per call.
 * Storage: JSON (data/broadcast_jobs.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'broadcast_jobs.json');

let sendOne = null; // async (recipientId, message, mediaPath) => { sent:boolean }
function setSender(fn) { sendOne = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { jobs: [] }; }
  catch { return { jobs: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Create a broadcast job.
 * @param {Object} opts { recipients:string[], message, mediaPath?, batchSize?, campaignId? }
 */
function createJob(opts = {}) {
  const recipients = Array.isArray(opts.recipients) ? opts.recipients : [];
  if (!recipients.length) throw new Error('recipients required');
  if (!opts.message && !opts.mediaPath) throw new Error('message or mediaPath required');
  const data = load();
  const job = {
    id: `BJOB-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    recipients,
    message: opts.message || '',
    mediaPath: opts.mediaPath || null,
    campaignId: opts.campaignId || null,
    batchSize: Math.max(1, Number(opts.batchSize || 50)),
    cursor: 0,                 // next index to send
    sent: 0, failed: 0,
    status: 'running',         // running | paused | done | cancelled
    createdAt: nowIso()
  };
  data.jobs.push(job);
  save(data);
  return jobView(job);
}

function jobView(j) {
  return { id: j.id, total: j.recipients.length, cursor: j.cursor, sent: j.sent, failed: j.failed,
    status: j.status, progressPct: j.recipients.length ? Math.round((j.cursor / j.recipients.length) * 100) : 100, campaignId: j.campaignId };
}

function setStatus(id, status) {
  const data = load();
  const j = data.jobs.find(x => x.id === id);
  if (!j) return null;
  if (['running', 'paused', 'cancelled'].includes(status)) j.status = status;
  save(data);
  return jobView(j);
}

function getJob(id) { const j = load().jobs.find(x => x.id === id); return j ? jobView(j) : null; }
function listJobs() { return load().jobs.map(jobView); }

/**
 * Advance one batch of one running job (the oldest running). Call repeatedly on an interval.
 * Progress is saved after EACH send so a crash resumes cleanly.
 */
async function tick() {
  if (!sendOne) return { advanced: 0, reason: 'no sender' };
  const data = load();
  const job = data.jobs.find(j => j.status === 'running' && j.cursor < j.recipients.length);
  if (!job) return { advanced: 0 };

  const end = Math.min(job.cursor + job.batchSize, job.recipients.length);
  let advanced = 0;
  for (let i = job.cursor; i < end; i++) {
    // re-check status mid-batch (pause/cancel)
    if (job.status !== 'running') break;
    const rcpt = job.recipients[i];
    try {
      const r = await sendOne(rcpt, job.message, job.mediaPath);
      if (r && r.sent) job.sent++; else job.failed++;
    } catch { job.failed++; }
    job.cursor = i + 1;
    advanced++;
    save(data); // persist after each send => resumable
  }
  if (job.cursor >= job.recipients.length) job.status = 'done';
  save(data);
  return { advanced, job: jobView(job) };
}

module.exports = { setSender, createJob, setStatus, getJob, listJobs, tick };
