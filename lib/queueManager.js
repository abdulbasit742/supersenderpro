'use strict';
/**
 * queueManager.js — durable automation/queue abstraction for SuperSender Pro.
 *
 * Design:
 *  - If REDIS_URL is set AND the `bullmq` package is installed (and QUEUE_MODE allows it),
 *    jobs are also enqueued into a BullMQ queue for real worker processing.
 *  - A local JSON store (data/job_queue.json) is ALWAYS the queryable source of truth, so the
 *    dashboard, admin commands and APIs keep working even when Redis/BullMQ are unavailable.
 *  - Everything BullMQ-related is lazy and wrapped in try/catch so a missing/broken Redis can
 *    never crash the server — it simply falls back to the JSON queue.
 *
 * Env:
 *   REDIS_URL            redis connection string (empty => JSON fallback)
 *   QUEUE_MODE           auto | bullmq | json   (default: auto)
 *   QUEUE_JSON_FALLBACK  true | false           (default: true)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.QUEUE_DATA_DIR || path.join(__dirname, '..', 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'job_queue.json');

const QUEUE_MODE = String(process.env.QUEUE_MODE || 'auto').toLowerCase();          // auto|bullmq|json
const JSON_FALLBACK = String(process.env.QUEUE_JSON_FALLBACK || 'true').toLowerCase() !== 'false';
const REDIS_URL = String(process.env.REDIS_URL || '').trim();

const KNOWN_TYPES = [
  'wa_channel_relay',
  'social_auto_post',
  'n8n_webhook',
  'payment_verification',
  'follow_up'
];

const VALID_STATUSES = ['pending', 'active', 'completed', 'failed', 'retrying'];
const MAX_JOBS = Number(process.env.QUEUE_MAX_ROWS || 5000);
const MAX_PAYLOAD_CHARS = Number(process.env.QUEUE_MAX_PAYLOAD_CHARS || 8000);

// ---------------------------------------------------------------------------
// Lazy BullMQ detection (never throws)
// ---------------------------------------------------------------------------
let _bullmq = null;
let _bullmqProbed = false;
function loadBullmq() {
  if (_bullmqProbed) return _bullmq;
  _bullmqProbed = true;
  try { _bullmq = require('bullmq'); } catch { _bullmq = null; }
  return _bullmq;
}

function bullmqEligible() {
  if (QUEUE_MODE === 'json') return false;
  if (!REDIS_URL) return false;
  if (QUEUE_MODE === 'bullmq' || QUEUE_MODE === 'auto') return !!loadBullmq();
  return false;
}

let _queue = null;
let _bullmqActive = false;
let _bullmqError = '';

function redisConnection() {
  try {
    const u = new URL(REDIS_URL);
    return {
      host: u.hostname || '127.0.0.1',
      port: Number(u.port || 6379),
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      db: (u.pathname && u.pathname.length > 1) ? (Number(u.pathname.slice(1)) || 0) : 0,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true
    };
  } catch {
    return { host: '127.0.0.1', port: 6379, maxRetriesPerRequest: null, lazyConnect: true };
  }
}

function ensureBullmq() {
  if (_bullmqActive) return true;
  if (!bullmqEligible()) return false;
  try {
    const { Queue } = loadBullmq();
    _queue = new Queue('supersender-jobs', { connection: redisConnection() });
    if (_queue && typeof _queue.on === 'function') {
      _queue.on('error', (e) => { _bullmqError = e && e.message ? e.message : String(e); });
    }
    _bullmqActive = true;
  } catch (e) {
    _bullmqError = e && e.message ? e.message : String(e);
    _bullmqActive = false;
  }
  return _bullmqActive;
}

function enqueueBullmq(job) {
  if (!bullmqEligible()) return;
  try {
    if (!ensureBullmq() || !_queue) return;
    _queue.add(job.type, job.payload, {
      jobId: job.id,
      attempts: job.maxAttempts || 3,
      removeOnComplete: 1000,
      removeOnFail: 5000
    }).catch((e) => { _bullmqError = e && e.message ? e.message : String(e); });
  } catch (e) {
    _bullmqError = e && e.message ? e.message : String(e);
  }
}

// ---------------------------------------------------------------------------
// JSON store (source of truth)
// ---------------------------------------------------------------------------
let _store = null;

function loadStore() {
  if (_store) return _store;
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      _store = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    }
  } catch {
    _store = null;
  }
  if (!_store || typeof _store !== 'object') _store = {};
  if (!Array.isArray(_store.jobs)) _store.jobs = [];
  return _store;
}

function persist() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    _store.updatedAt = new Date().toISOString();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(_store, null, 2));
  } catch {
    /* best-effort: never throw from the queue layer */
  }
}

function newId() {
  try { if (typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch {}
  return crypto.randomBytes(12).toString('hex');
}

function safePayload(payload) {
  try {
    const str = JSON.stringify(payload == null ? {} : payload);
    if (str.length <= MAX_PAYLOAD_CHARS) return JSON.parse(str);
    return { _truncated: true, preview: str.slice(0, MAX_PAYLOAD_CHARS) };
  } catch {
    return { _unserializable: true };
  }
}

function clampStatus(status) {
  const s = String(status || 'pending').toLowerCase();
  return VALID_STATUSES.includes(s) ? s : 'pending';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function addJob(type, payload = {}, options = {}) {
  loadStore();
  const now = new Date().toISOString();
  const status = clampStatus(options.status);
  const job = {
    id: options.id || newId(),
    type: String(type || 'generic'),
    payload: safePayload(payload),
    status,
    attempts: Number(options.attempts || 0),
    maxAttempts: Math.max(1, Number(options.maxAttempts || 3)),
    priority: Number(options.priority || 0),
    source: options.source || 'api',
    result: options.result != null ? options.result : null,
    error: options.error != null ? String(options.error) : null,
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'completed' ? now : null,
    failedAt: status === 'failed' ? now : null,
    mode: _bullmqActive ? 'bullmq' : 'json-fallback'
  };
  _store.jobs.unshift(job);
  if (_store.jobs.length > MAX_JOBS) _store.jobs = _store.jobs.slice(0, MAX_JOBS);
  persist();
  if (status === 'pending') enqueueBullmq(job);
  return job;
}

function getJobs(filter = {}) {
  loadStore();
  let jobs = _store.jobs.slice();
  if (filter.status) {
    const want = clampStatus(filter.status);
    jobs = jobs.filter(j => j.status === want);
  }
  if (filter.type) jobs = jobs.filter(j => j.type === filter.type);
  jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limit = Number(filter.limit || 0);
  if (limit > 0) jobs = jobs.slice(0, limit);
  return jobs;
}

function getJob(id) {
  loadStore();
  return _store.jobs.find(j => j.id === String(id)) || null;
}

function updateJob(id, patch = {}) {
  loadStore();
  const job = _store.jobs.find(j => j.id === String(id));
  if (!job) return null;
  const allowed = ['status', 'payload', 'attempts', 'maxAttempts', 'priority', 'result', 'error'];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      job[key] = key === 'status' ? clampStatus(patch[key]) : patch[key];
    }
  }
  job.updatedAt = new Date().toISOString();
  persist();
  return job;
}

function retryJob(id) {
  loadStore();
  const job = _store.jobs.find(j => j.id === String(id));
  if (!job) return null;
  job.status = 'pending';
  job.error = null;
  job.result = null;
  job.failedAt = null;
  job.attempts = Number(job.attempts || 0); // keep attempt history
  job.retriedAt = new Date().toISOString();
  job.updatedAt = job.retriedAt;
  job.mode = _bullmqActive ? 'bullmq' : 'json-fallback';
  persist();
  enqueueBullmq(job);
  return job;
}

function completeJob(id, result = null) {
  loadStore();
  const job = _store.jobs.find(j => j.id === String(id));
  if (!job) return null;
  job.status = 'completed';
  job.result = result;
  job.error = null;
  job.completedAt = new Date().toISOString();
  job.updatedAt = job.completedAt;
  persist();
  return job;
}

function failJob(id, error = '') {
  loadStore();
  const job = _store.jobs.find(j => j.id === String(id));
  if (!job) return null;
  job.status = 'failed';
  job.error = typeof error === 'string' ? error : (error && error.message ? error.message : String(error));
  job.attempts = Number(job.attempts || 0) + 1;
  job.failedAt = new Date().toISOString();
  job.updatedAt = job.failedAt;
  persist();
  return job;
}

function getCounts() {
  loadStore();
  const counts = { pending: 0, active: 0, completed: 0, failed: 0, retrying: 0, total: _store.jobs.length };
  for (const j of _store.jobs) counts[j.status] = (counts[j.status] || 0) + 1;
  return counts;
}

function getQueueHealth() {
  // attempt to bring bullmq online if eligible (lazy, safe)
  if (bullmqEligible()) ensureBullmq();
  const counts = getCounts();
  const mode = _bullmqActive ? 'bullmq' : 'json-fallback';
  const ok = _bullmqActive ? true : JSON_FALLBACK;
  const status = _bullmqActive
    ? 'ready'
    : (JSON_FALLBACK ? 'ready_with_fallback' : 'degraded');
  return {
    ok,
    mode,
    status,
    queueMode: QUEUE_MODE,
    fallbackEnabled: JSON_FALLBACK,
    bullmqAvailable: !!loadBullmq(),
    redis: {
      configured: !!REDIS_URL,
      connected: _bullmqActive,
      error: _bullmqError || ''
    },
    counts,
    knownTypes: KNOWN_TYPES,
    file: QUEUE_FILE,
    checkedAt: new Date().toISOString()
  };
}

module.exports = {
  addJob,
  getJobs,
  getJob,
  updateJob,
  retryJob,
  completeJob,
  failJob,
  getQueueHealth,
  getCounts,
  KNOWN_TYPES
};
