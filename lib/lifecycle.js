'use strict';
/**
 * lib/lifecycle.js - graceful shutdown + readiness gating for zero-downtime deploys.
 *
 * On SIGTERM/SIGINT: flip readiness to 'draining' (so /api/health/ready returns 503 and the
 * load balancer stops sending new traffic), stop the HTTP server from accepting connections,
 * run registered closers (Redis, Prisma, queues) with a hard deadline, then exit cleanly.
 *
 * Additive: call install(server) once after the server is listening. Other modules can call
 * onShutdown(fn) to register cleanup, and isReady() to gate readiness checks.
 */
let logger = console;
try { logger = require('./observability/logger'); } catch {}

let ready = true;          // becomes false the moment we start draining
let shuttingDown = false;
const closers = [];        // [{ name, fn }]

const DEADLINE_MS = Number(process.env.SHUTDOWN_DEADLINE_MS || 15000);
const DRAIN_DELAY_MS = Number(process.env.SHUTDOWN_DRAIN_MS || 3000); // let LB notice 503 before closing

function isReady() { return ready && !shuttingDown; }
function onShutdown(name, fn) {
  if (typeof name === 'function') { fn = name; name = 'anonymous'; }
  if (typeof fn === 'function') closers.push({ name, fn });
}

async function runClosers() {
  for (const c of closers) {
    try { await Promise.resolve(c.fn()); (logger.info ? logger.info({ msg: 'closer_done', name: c.name }) : logger.log('closer_done', c.name)); }
    catch (e) { (logger.warn ? logger.warn({ msg: 'closer_failed', name: c.name, err: e.message }) : logger.log('closer_failed', c.name, e.message)); }
  }
}

// Try to register Redis/Prisma closers automatically if those libs are present.
function autoRegister() {
  try { const r = require('./redis/client'); if (r && r.available && r.available()) { const c = r.getClient(); if (c && c.quit) onShutdown('redis', () => c.quit()); } } catch {}
}

function install(server) {
  autoRegister();
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    ready = false; // readiness now 503 -> LB drains us
    (logger.warn ? logger.warn({ msg: 'shutdown_initiated', signal, drainMs: DRAIN_DELAY_MS, deadlineMs: DEADLINE_MS }) : logger.log('shutdown', signal));

    const hardKill = setTimeout(() => { (logger.error ? logger.error({ msg: 'shutdown_forced (deadline)' }) : logger.log('shutdown forced')); process.exit(1); }, DEADLINE_MS);
    hardKill.unref && hardKill.unref();

    // Give the LB a moment to see readiness flip before we stop accepting connections.
    setTimeout(() => {
      const done = async () => { await runClosers(); clearTimeout(hardKill); (logger.info ? logger.info({ msg: 'shutdown_complete' }) : logger.log('shutdown complete')); process.exit(0); };
      if (server && server.close) server.close(() => { done(); }); else done();
    }, DRAIN_DELAY_MS);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => { (logger.error ? logger.error({ msg: 'unhandledRejection', reason: String(reason) }) : logger.log('unhandledRejection', reason)); });
  (logger.info ? logger.info({ msg: 'lifecycle_installed' }) : logger.log('lifecycle installed'));
  return { isReady, onShutdown };
}

module.exports = { install, onShutdown, isReady };
