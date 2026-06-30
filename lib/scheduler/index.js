'use strict';
/**
 * lib/scheduler/index.js - one place to register + run periodic jobs.
 * Several subsystems need background work (sales follow-up/cart-recovery tick, audit retention,
 * uptime sampling). This avoids each spinning its own setInterval with no visibility.
 *
 * Uses node-cron if available (already a dep) for cron expressions; otherwise falls back to
 * setInterval for simple ms intervals. Each job is wrapped: a throwing job is logged, recorded,
 * and never crashes the loop. Status is queryable for the ops dashboard.
 */
let cron = null; try { cron = require('node-cron'); } catch {}
let logger = console; try { logger = require('../observability/logger'); } catch {}

const jobs = new Map(); // name -> { name, schedule|intervalMs, fn, handle, lastRun, lastError, runs }
let started = false;

function register(name, { schedule, intervalMs, fn, runOnBoot = false }) {
  if (!name || typeof fn !== 'function') throw new Error('register(name, { fn, schedule|intervalMs })');
  jobs.set(name, { name, schedule, intervalMs, fn, runOnBoot, handle: null, lastRun: null, lastError: null, runs: 0 });
  if (started) _arm(jobs.get(name));
  return jobs.get(name);
}

async function _run(job) {
  try { await job.fn(); job.lastRun = new Date().toISOString(); job.lastError = null; job.runs += 1; }
  catch (e) { job.lastError = e.message; (logger.error ? logger.error({ msg: 'job_failed', job: job.name, err: e.message }) : logger.error('[scheduler] job failed', job.name, e.message)); }
}

function _arm(job) {
  if (job.runOnBoot) _run(job);
  if (job.schedule && cron && cron.validate && cron.validate(job.schedule)) {
    job.handle = cron.schedule(job.schedule, () => _run(job));
  } else {
    const ms = job.intervalMs || 60000;
    job.handle = setInterval(() => _run(job), ms);
    if (job.handle.unref) job.handle.unref();
  }
}

function start() {
  if (started) return; started = true;
  for (const job of jobs.values()) _arm(job);
  (logger.info ? logger.info({ msg: 'scheduler_started', jobs: jobs.size }) : logger.log('[scheduler] started', jobs.size));
}

function stop() {
  for (const job of jobs.values()) { try { if (job.handle) { if (job.handle.stop) job.handle.stop(); else clearInterval(job.handle); } } catch {} job.handle = null; }
  started = false;
}

function status() {
  return { started, jobs: [...jobs.values()].map((j) => ({ name: j.name, schedule: j.schedule || (j.intervalMs + 'ms'), runs: j.runs, lastRun: j.lastRun, lastError: j.lastError })) };
}

module.exports = { register, start, stop, status, _run, jobs };
