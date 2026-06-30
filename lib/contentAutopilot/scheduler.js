// lib/contentAutopilot/scheduler.js
// The 'autopilot' part: a tiny interval worker that (1) expands due recurring
// campaigns into fresh queued jobs, then (2) auto-publishes due jobs.
// Start it once and it keeps the whole pipeline moving with zero prompts.
//
// Notes:
// - No new dependencies (uses setInterval).
// - Singleton: start() is idempotent; calling twice won't double-run.
// - Safe: each tick is wrapped so a single failure never kills the loop.

const orchestrator = require('./index');
let campaigns = null;
try { campaigns = require('./campaigns'); } catch (e) { campaigns = null; }

let timer = null;
let running = false;
let lastTick = null;
let lastResult = null;
let intervalMs = 5 * 60 * 1000; // default: every 5 minutes

async function tick() {
  if (running) return; // don't overlap ticks
  running = true;
  lastTick = new Date().toISOString();
  const out = {};
  try {
    // 1) expand recurring campaigns into fresh jobs
    if (campaigns && typeof campaigns.runDueCampaigns === 'function') {
      out.campaigns = await campaigns.runDueCampaigns(orchestrator, Date.now());
    }
    // 2) publish everything that's due
    out.publish = await orchestrator.publishDue();
    lastResult = out;
  } catch (e) {
    lastResult = { error: e.message };
  } finally {
    running = false;
  }
  return lastResult;
}

function start(minutes) {
  if (minutes && Number(minutes) > 0) intervalMs = Number(minutes) * 60 * 1000;
  if (timer) return { ok: true, alreadyRunning: true, intervalMinutes: intervalMs / 60000 };
  void tick();
  timer = setInterval(() => { void tick(); }, intervalMs);
  if (timer.unref) timer.unref();
  return { ok: true, started: true, intervalMinutes: intervalMs / 60000 };
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  return { ok: true, stopped: true };
}

function status() {
  return { active: !!timer, busyRightNow: running, intervalMinutes: intervalMs / 60000, lastTick, lastResult };
}

module.exports = { start, stop, status, tick };
