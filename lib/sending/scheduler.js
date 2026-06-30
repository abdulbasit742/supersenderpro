'use strict';
/**
 * scheduler.js — Sending Feature #2: schedule sends for later (and recurring).
 *
 * Until now everything sends immediately. This adds "send at 9am tomorrow" and "every Monday". A job
 * captures WHAT to send (a direct message or a segment broadcast) and WHEN. A periodic tick() fires
 * everything that's due through the injected (guarded) sender, then reschedules recurring jobs.
 *
 * Decoupled senders are injected so this rides on the anti-ban guard (#1) automatically:
 *   setMessageSender(async (phone, text) => ...)        // guarded WA send
 *   setBroadcastRunner(async ({segmentId,message}) => ...) // marketing #3 segment broadcast
 *
 * Storage: JSON (data/scheduled_sends.json) so jobs survive restarts.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'scheduled_sends.json');

let messageSender = null;   // async (phone, text) => any
let broadcastRunner = null; // async ({ segmentId, message, mediaPath }) => any
function setMessageSender(fn) { messageSender = typeof fn === 'function' ? fn : null; }
function setBroadcastRunner(fn) { broadcastRunner = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { jobs: [] }; }
  catch { return { jobs: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();
const DAY = 86400000;

const RECUR_MS = { daily: DAY, weekly: 7 * DAY, hourly: 3600000 };

/**
 * Schedule a job.
 * @param {Object} opts
 *   type: 'message' | 'broadcast'
 *   runAt: ISO string or ms (when to first run)
 *   recurring?: 'daily' | 'weekly' | 'hourly' (optional)
 *   // for message: { phone, text }
 *   // for broadcast: { segmentId, message, mediaPath? }
 */
function schedule(opts = {}) {
  if (!['message', 'broadcast'].includes(opts.type)) throw new Error("type must be 'message' or 'broadcast'");
  const runAt = typeof opts.runAt === 'number' ? opts.runAt : new Date(opts.runAt || Date.now()).getTime();
  if (Number.isNaN(runAt)) throw new Error('invalid runAt');
  if (opts.type === 'message' && (!opts.phone || !opts.text)) throw new Error('message job needs phone + text');
  if (opts.type === 'broadcast' && !opts.segmentId) throw new Error('broadcast job needs segmentId');

  const data = load();
  const job = {
    id: `SCH-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    type: opts.type,
    payload: opts.type === 'message'
      ? { phone: opts.phone, text: opts.text }
      : { segmentId: opts.segmentId, message: opts.message || '', mediaPath: opts.mediaPath || null },
    runAt,
    recurring: RECUR_MS[opts.recurring] ? opts.recurring : null,
    status: 'scheduled',   // scheduled | done | failed | cancelled
    createdAt: iso(nowMs()),
    history: []
  };
  data.jobs.push(job);
  save(data);
  return job;
}

function cancel(jobId) {
  const data = load();
  const j = data.jobs.find(x => x.id === jobId);
  if (!j) return null;
  j.status = 'cancelled';
  save(data);
  return j;
}

function list(filter = {}) {
  let rows = load().jobs;
  if (filter.status) rows = rows.filter(j => j.status === filter.status);
  if (filter.type) rows = rows.filter(j => j.type === filter.type);
  return rows;
}

async function runJob(job) {
  if (job.type === 'message') {
    if (!messageSender) throw new Error('no message sender wired');
    return messageSender(job.payload.phone, job.payload.text);
  }
  if (job.type === 'broadcast') {
    if (!broadcastRunner) throw new Error('no broadcast runner wired');
    return broadcastRunner(job.payload);
  }
  throw new Error('unknown job type');
}

/**
 * Fire all due jobs. Call on an interval (e.g. every minute). Recurring jobs are rescheduled for
 * their next occurrence; one-offs are marked done.
 */
async function tick() {
  const data = load();
  const t = nowMs();
  let fired = 0, failed = 0;

  for (const job of data.jobs) {
    if (job.status !== 'scheduled') continue;
    if (t < job.runAt) continue;

    try {
      const out = await runJob(job);
      job.history.push({ at: iso(t), status: 'fired', out: out === undefined ? null : out });
      fired++;
    } catch (e) {
      job.history.push({ at: iso(t), status: 'error', error: e.message });
      failed++;
    }
    if (job.history.length > 50) job.history = job.history.slice(-50);

    if (job.recurring && RECUR_MS[job.recurring]) {
      // reschedule to the next slot in the future
      let next = job.runAt + RECUR_MS[job.recurring];
      while (next <= t) next += RECUR_MS[job.recurring];
      job.runAt = next;
      // stays 'scheduled'
    } else {
      job.status = failed && job.history.slice(-1)[0].status === 'error' ? 'failed' : 'done';
    }
  }
  save(data);
  return { fired, failed, at: iso(t) };
}

module.exports = { setMessageSender, setBroadcastRunner, schedule, cancel, list, tick };
