// lib/contentAutopilot/scheduler.js
// The 'autopilot' part: a tiny interval worker that auto-publishes due jobs
// with zero manual triggers. Start it once and it keeps the queue moving.
//
// Notes:
// - No new dependencies (uses setInterval).
// - Singleton: start() is idempotent; calling twice won't double-run.
// - Safe: each tick is wrapped so a single failure never kills the loop.
// - Designed to be started from server.js OR triggered externally via the
//   /publish route (cron / n8n). Both paths are fine; pick one.

const orchestrator = require('./index');

let timer = null;
let running = false;
let lastTick = null;
let lastResult = null;
let intervalMs = 5 * 60 * 1000; // default: every 5 minutes

async function tick() {
  if (running) return; // don't overlap ticks
  running = true;
  lastTick = new Date().toISOString();
  try {
    lastResult = await orchestrator.publishDue();
  } catch (e) {
    lastResult = { ran: 0, error: e.message };
  } finally {
    running = false;
  }
  return lastResult;
}

function start(minutes) {
  if (minutes && Number(minutes) > 0) intervalMs = Number(minutes) * 60 * 1000;
  if (timer) return { ok: true, alreadyRunning: true, intervalMinutes: intervalMs / 60000 };
  // fire one tick immediately, then on the interval
  void tick();
  timer = setInterval(() => { void tick(); }, intervalMs);
  if (timer.unref) timer.unref(); // don't keep the process alive just for this
  return { ok: true, started: true, intervalMinutes: intervalMs / 60000 };
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  return { ok: true, stopped: true };
}

function status() {
  return {
    active: !!timer,
    busyRightNow: running,
    intervalMinutes: intervalMs / 60000,
    lastTick,
    lastResult,
  };
}

module.exports = { start, stop, status, tick };
