'use strict';
/**
 * lib/observability/uptime.js - lightweight self-uptime monitor.
 * Periodically asks the health subsystem for status, records up/down samples in a rolling
 * ring buffer, computes uptime %, and logs incidents (transitions). No external service.
 */
const logger = require('./logger');

let H = null; try { H = require('../healthCheck'); } catch {}

const MAX_SAMPLES = Number(process.env.UPTIME_SAMPLES || 1440); // e.g. 24h at 1/min
const samples = []; // { at, status, up }
const incidents = []; // { from, to, at }
let lastStatus = null;
let handle = null;

function record(status) {
  const up = status === 'ok' || status === 'degraded';
  samples.unshift({ at: new Date().toISOString(), status, up });
  if (samples.length > MAX_SAMPLES) samples.length = MAX_SAMPLES;
  if (lastStatus !== null && lastStatus !== status) {
    incidents.unshift({ from: lastStatus, to: status, at: new Date().toISOString() });
    if (incidents.length > 200) incidents.length = 200;
    logger.warn({ msg: 'uptime_transition', from: lastStatus, to: status });
  }
  lastStatus = status;
  return up;
}

async function sampleOnce() {
  let status = 'unknown';
  try { status = H ? (await H.getHealth({ force: true })).status : 'unknown'; }
  catch { status = 'down'; }
  return record(status);
}

function summary() {
  const total = samples.length;
  const ups = samples.filter((s) => s.up).length;
  return {
    currentStatus: lastStatus || 'unknown',
    samples: total,
    uptimePct: total ? Math.round((ups / total) * 10000) / 100 : null,
    incidents: incidents.slice(0, 20),
    since: total ? samples[samples.length - 1].at : null,
  };
}

function start(intervalSec) {
  if (handle) return handle;
  const ms = Math.max(15, Number(intervalSec || process.env.UPTIME_INTERVAL_SEC || 60)) * 1000;
  // prime one sample immediately
  sampleOnce().catch(() => {});
  handle = setInterval(() => { sampleOnce().catch(() => {}); }, ms);
  if (handle.unref) handle.unref();
  logger.info({ msg: 'uptime_monitor_started', intervalSec: ms / 1000 });
  return handle;
}

module.exports = { start, sampleOnce, summary, record };
