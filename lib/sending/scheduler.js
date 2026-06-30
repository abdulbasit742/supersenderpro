'use strict';
/**
 * scheduler.js — Sending Feature #2: schedule messages/broadcasts for later.
 *
 * Drip (marketing #2) handles per-contact sequences; this handles "send THIS at THAT time" — one-off
 * scheduled messages and recurring ones (daily/weekly). A tick() sweep fires anything due through an
 * injected sender (wire the GUARDED sender from sending #1 so scheduled blasts stay rate-safe).
 *
 * Durable: jobs live in data/scheduled_sends.json, so a restart doesn't lose them. tick() is safe to
 * call on an interval (e.g. every minute via node-cron).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'scheduled_sends.json');

// Injected sender: async (job) => any. job has { kind, to?, message, mediaPath?, targets? }
let sender = null;
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }

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
const DAY = 86400000, WEEK = 604800000;

function nextRecurrence(job, fromMs) {
  if (job.repeat === 'daily') return fromMs + DAY;
  if (job.repeat === 'weekly') return fromMs + WEEK;
  if (job.repeat === 'hourly') return fromMs + 3600000;
  return null; // one-off
}

/**
 * Schedule a send.
 * @param {Object} opts
 *   kind: 'message' | 'broadcast'
 *   runAt: ISO string or ms timestamp (when to send)
 *   message, mediaPath?
 *   to?      (for kind 'message')
 *   targets? (for kind 'broadcast' — passed to the broadcast hub: {all}|{kinds}|{ids})
 *   repeat?  'hourly' | 'daily' | 'weekly' (omit for one-off)
 */
function schedule(opts = {}) {
  if (!opts.runAt) throw new Error('runAt is required');
  if (!opts.message && !opts.mediaPath) throw new Error('message or mediaPath required');
  const kind = opts.kind === 'broadcast' ? 'broadcast' : 'message';
  if (kind === 'message' && !opts.to) throw new Error('to is required for a message');
  const runAt = typeof opts.runAt === 'number' ? opts.runAt : new Date(opts.runAt).getTime();
  if (Number.isNaN(runAt)) throw new Error('invalid runAt');

  const data = load();
  const job = {
    id: `SCH-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    kind,
    to: opts.to || null,
    targets: opts.targets || null,
    message: opts.message || '',
    mediaPath: opts.mediaPath || null,
    repeat: ['hourly','daily','weekly'].includes(opts.repeat) ? opts.repeat : null,
    runAt,
    status: 'scheduled',     // scheduled | sent | failed | cancelled
    createdAt: iso(nowMs()),
    history: []
  };
  data.jobs.push(job);
  save(data);
  return job;
}

function cancel(id) {
  const data = load();
  const job = data.jobs.find(j => j.id === id);
  if (!job) return null;
  job.status = 'cancelled';
  save(data);
  return job;
}

function list(filter = {}) {
  let rows = load().jobs;
  if (filter.status) rows = rows.filter(j => j.status === filter.status);
  return rows;
}

/**
 * Fire all due jobs. Call on an interval. Recurring jobs are rescheduled; one-offs are marked sent.
 */
async function tick() {
  const data = load();
  const t = nowMs();
  let fired = 0, failed = 0;

  for (const job of data.jobs) {
    if (job.status !== 'scheduled') continue;
    if (t < job.runAt) continue;
    if (!sender) break; // no sender wired; try again next tick

    try {
      await sender(job);
      job.history.push({ at: iso(t), status: 'sent' });
      fired++;
      const next = nextRecurrence(job, job.runAt);
      if (next) { job.runAt = next; /* stays 'scheduled' */ }
      else { job.status = 'sent'; job.sentAt = iso(t); }
    } catch (e) {
      job.history.push({ at: iso(t), status: 'failed', error: e.message });
      job.status = job.repeat ? 'scheduled' : 'failed';
      if (job.repeat) { const n = nextRecurrence(job, job.runAt); if (n) job.runAt = n; }
      failed++;
    }
  }
  save(data);
  return { fired, failed, at: iso(t) };
}

module.exports = { setSender, schedule, cancel, list, tick };
