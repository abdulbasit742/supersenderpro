'use strict';
/**
 * lib/healthCheck/index.js - Core Stability health-check subsystem.
 * Covers backlog TASK-0002 (add), 0003 (verify), 0004 (harden), 0005 (optimize), 0006 (document).
 *
 * Design goals (from acceptance criteria):
 *  - Wired into server via routes (see routes/healthRoutes.js + scripts/wire-health-check.js).
 *  - Clear failure handling: every probe is wrapped; one bad probe never crashes the check.
 *  - Optimized: probes run in parallel with a hard timeout; results cached briefly (TTL)
 *    so a hammering load balancer can't stampede the disk/CPU.
 *  - Verifiable: `node scripts/health-verify.js` exits non-zero when unhealthy.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { dbProbe, redisProbe } = require('./probes/datastore');

const DATA_DIR = path.join(__dirname, '../../data');
const CACHE_TTL_MS = Number(process.env.HEALTH_CACHE_TTL_MS || 3000);
const PROBE_TIMEOUT_MS = Number(process.env.HEALTH_PROBE_TIMEOUT_MS || 1500);

let cache = { at: 0, report: null };

const withTimeout = (p, ms, label) => Promise.race([
  Promise.resolve().then(() => p),
  new Promise((_, rej) => setTimeout(() => rej(new Error((label || 'probe') + ' timed out after ' + ms + 'ms')), ms)),
]);

// Measure event-loop lag: schedule a 0ms timer, see how late it fires.
function eventLoopLag() {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lagMs = Number(process.hrtime.bigint() - start) / 1e6;
      resolve({ status: lagMs < 200 ? 'ok' : (lagMs < 1000 ? 'degraded' : 'down'), lagMs: Math.round(lagMs) });
    });
  });
}

function memoryProbe() {
  const mem = process.memoryUsage();
  const totalMB = Math.round(mem.rss / 1048576);
  const heapUsedMB = Math.round(mem.heapUsed / 1048576);
  const sysFreePct = Math.round((os.freemem() / os.totalmem()) * 100);
  return { status: sysFreePct > 5 ? 'ok' : 'degraded', rssMB: totalMB, heapUsedMB, sysFreePct };
}

async function dataDirWritable() {
  const probe = path.join(DATA_DIR, '.health_probe');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(probe, String(Date.now()));
    fs.readFileSync(probe, 'utf8');
    fs.unlinkSync(probe);
    return { status: 'ok' };
  } catch (e) {
    return { status: 'down', error: e.message };
  }
}

// Confirm a representative JSON store parses (catches corruption early).
async function jsonStoreReadable() {
  try {
    if (!fs.existsSync(DATA_DIR)) return { status: 'ok', note: 'no data dir yet' };
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).slice(0, 5);
    let checked = 0;
    for (const f of files) {
      try { JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); checked++; }
      catch (e) { return { status: 'degraded', file: f, error: 'parse failed: ' + e.message }; }
    }
    return { status: 'ok', filesChecked: checked };
  } catch (e) {
    return { status: 'degraded', error: e.message };
  }
}

// Optional: local Ollama reachability (self-hosted inference). Never fails the
// overall check hard - inference being down is 'degraded', server can still serve.
async function ollamaProbe() {
  const url = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  if (process.env.HEALTH_CHECK_OLLAMA === 'false') return { status: 'skipped' };
  try {
    if (typeof fetch !== 'function') return { status: 'skipped', note: 'no global fetch' };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url + '/api/tags', { signal: ctrl.signal });
    clearTimeout(t);
    return { status: res.ok ? 'ok' : 'degraded', code: res.status };
  } catch (e) {
    return { status: 'degraded', error: e.message };
  }
}

const PROBES = {
  eventLoop: eventLoopLag,
  memory: async () => memoryProbe(),
  dataDir: dataDirWritable,
  jsonStore: jsonStoreReadable,
  db: dbProbe,
  redis: redisProbe,
  ollama: ollamaProbe,
};

// Roll up individual probe statuses into one overall status.
function rollup(checks) {
  const vals = Object.values(checks).map((c) => c && c.status).filter(Boolean);
  if (vals.includes('down')) return 'down';
  if (vals.includes('degraded')) return 'degraded';
  return 'ok';
}

async function runProbe(name, fn) {
  try { return await withTimeout(fn(), PROBE_TIMEOUT_MS, name); }
  catch (e) { return { status: 'down', error: e.message }; }
}

// Full health report. Cached for CACHE_TTL_MS to avoid stampedes.
async function getHealth(opts = {}) {
  const now = Date.now();
  if (!opts.force && cache.report && (now - cache.at) < CACHE_TTL_MS) {
    return Object.assign({}, cache.report, { cached: true });
  }
  const entries = await Promise.all(
    Object.entries(PROBES).map(async ([name, fn]) => [name, await runProbe(name, fn)])
  );
  const checks = Object.fromEntries(entries);
  const report = {
    status: rollup(checks),
    uptimeSec: Math.round(process.uptime()),
    pid: process.pid,
    node: process.version,
    host: os.hostname(),
    timestamp: new Date().toISOString(),
    checks,
    cached: false,
  };
  cache = { at: now, report };
  // Best-effort: persist latest report for ops tooling (matches repo's health_report.json).
  try { fs.writeFileSync(path.join(__dirname, '../../health_report.json'), JSON.stringify(report, null, 2)); } catch {}
  return report;
}

// Liveness: is the process up and the event loop responsive? (cheap, no I/O)
async function getLiveness() {
  const el = await runProbe('eventLoop', eventLoopLag);
  return { status: el.status === 'down' ? 'down' : 'ok', uptimeSec: Math.round(process.uptime()), eventLoop: el };
}

// Readiness: can we actually serve? (data dir + json store + db must be ok)
async function getReadiness() {
  const [dir, store, db] = await Promise.all([runProbe('dataDir', dataDirWritable), runProbe('jsonStore', jsonStoreReadable), runProbe('db', dbProbe)]);
  const status = (dir.status === 'down' || db.status === 'down') ? 'down' : rollup({ dir, store, db });
  return { status, checks: { dataDir: dir, jsonStore: store, db } };
}

module.exports = { getHealth, getLiveness, getReadiness, PROBES };
