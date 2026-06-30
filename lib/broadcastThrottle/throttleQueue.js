'use strict';
/**
 * Broadcast Throttle / Safe-Send Queue
 * ------------------------------------
 * Paces broadcast sends so a WhatsApp number never bursts and gets flagged.
 *
 * Deterministic core (works with NO model):
 *   - enqueue(recipients[], opts) -> queued jobs
 *   - dispatch() -> releases only what the rate budget + caps allow right now
 *   - respects: per-minute + per-hour + per-day caps (number-health, feature #68)
 *               consent gate (feature #80)  -> skipped if not consented
 *               send-time slots (feature #21) -> deferred if outside window
 *   - jitter so sends don't look robotic
 *
 * AI is OPTIONAL: if a model is online we can ask it to re-order the queue by
 * predicted engagement, but the queue runs fine with zero AI.
 *
 * Zero new deps. Node built-ins + file-backed storage under data/.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'broadcastThrottle');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const STATE_FILE = path.join(DATA_DIR, 'counters.json');

const DEFAULT_CAPS = {
  perMinute: Number(process.env.THROTTLE_PER_MINUTE || 20),
  perHour: Number(process.env.THROTTLE_PER_HOUR || 400),
  perDay: Number(process.env.THROTTLE_PER_DAY || 5000),
  jitterMs: Number(process.env.THROTTLE_JITTER_MS || 1500)
};

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function now() {
  return Date.now();
}

function windowKeys(ts) {
  const d = new Date(ts);
  const min = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${d.getUTCMinutes()}`;
  const hour = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
  const day = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  return { min, hour, day };
}

function loadCounters() {
  return readJson(STATE_FILE, { min: {}, hour: {}, day: {} });
}

function saveCounters(c) {
  writeJson(STATE_FILE, c);
}

function loadQueue() {
  return readJson(QUEUE_FILE, { jobs: [] });
}

function saveQueue(q) {
  writeJson(QUEUE_FILE, q);
}

function sanitizeRecipient(r) {
  if (typeof r === 'string') return { phone: r };
  return Object.assign({}, r);
}

/**
 * Optional hooks injected by caller so this module stays decoupled from the
 * other features. Each is a function; if absent we assume "allow".
 *   hooks.isConsented(phone) -> bool
 *   hooks.inSendWindow(phone, ts) -> bool
 *   hooks.numberHealthOk(phone) -> bool
 *   hooks.send(job) -> Promise   (the real WhatsApp send; dry-run by default)
 */
function enqueue(recipients, opts = {}, hooks = {}) {
  const list = (recipients || []).map(sanitizeRecipient);
  const q = loadQueue();
  const batchId = `b_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let skipped = 0;
  for (const r of list) {
    if (hooks.isConsented && !hooks.isConsented(r.phone)) {
      skipped++;
      continue;
    }
    q.jobs.push({
      id: `j_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      batchId,
      phone: r.phone,
      payload: opts.payload || r.payload || null,
      template: opts.template || r.template || null,
      priority: r.priority || opts.priority || 0,
      status: 'queued',
      attempts: 0,
      enqueuedAt: now()
    });
  }
  saveQueue(q);
  return { batchId, queued: q.jobs.filter((j) => j.batchId === batchId).length, skipped };
}

function capRemaining(caps, counters, ts) {
  const k = windowKeys(ts);
  const minUsed = counters.min[k.min] || 0;
  const hourUsed = counters.hour[k.hour] || 0;
  const dayUsed = counters.day[k.day] || 0;
  return {
    minute: Math.max(0, caps.perMinute - minUsed),
    hour: Math.max(0, caps.perHour - hourUsed),
    day: Math.max(0, caps.perDay - dayUsed),
    keys: k
  };
}

function bumpCounters(counters, k) {
  counters.min[k.min] = (counters.min[k.min] || 0) + 1;
  counters.hour[k.hour] = (counters.hour[k.hour] || 0) + 1;
  counters.day[k.day] = (counters.day[k.day] || 0) + 1;
}

/**
 * Releases as many jobs as the rate budget + caps + windows allow right now.
 * Returns the jobs that were dispatched (or would be, in dry-run).
 */
async function dispatch(opts = {}, hooks = {}) {
  const caps = Object.assign({}, DEFAULT_CAPS, opts.caps || {});
  const dryRun = opts.dryRun !== false; // dry-run by default (safe)
  const ts = opts.now || now();
  const q = loadQueue();
  const counters = loadCounters();
  const budget = capRemaining(caps, counters, ts);
  const allowedThisTick = Math.min(budget.minute, budget.hour, budget.day, opts.max || Infinity);

  const dispatched = [];
  const deferred = [];
  let released = 0;

  const pending = q.jobs
    .filter((j) => j.status === 'queued')
    .sort((a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt);

  for (const job of pending) {
    if (released >= allowedThisTick) break;
    if (hooks.numberHealthOk && !hooks.numberHealthOk(job.phone)) {
      job.status = 'held';
      job.heldReason = 'number-health';
      continue;
    }
    if (hooks.inSendWindow && !hooks.inSendWindow(job.phone, ts)) {
      job.status = 'deferred';
      job.deferReason = 'send-window';
      deferred.push(job.id);
      continue;
    }
    job.attempts += 1;
    job.status = 'sent';
    job.sentAt = ts;
    job.dryRun = dryRun;
    if (!dryRun && hooks.send) {
      try {
        await hooks.send(job);
      } catch (e) {
        job.status = 'failed';
        job.error = String(e && e.message ? e.message : e);
      }
    }
    bumpCounters(counters, budget.keys);
    released++;
    dispatched.push(job.id);
  }

  saveQueue(q);
  saveCounters(counters);
  return {
    dispatched: dispatched.length,
    deferred: deferred.length,
    budget: { minute: budget.minute, hour: budget.hour, day: budget.day },
    allowedThisTick,
    dryRun,
    jobs: dispatched
  };
}

function stats() {
  const q = loadQueue();
  const byStatus = {};
  for (const j of q.jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1;
  return { total: q.jobs.length, byStatus };
}

function reset() {
  saveQueue({ jobs: [] });
  saveCounters({ min: {}, hour: {}, day: {} });
}

module.exports = {
  enqueue,
  dispatch,
  stats,
  reset,
  capRemaining,
  DEFAULT_CAPS
};
