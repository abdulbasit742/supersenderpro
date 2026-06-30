'use strict';
/**
 * healthMonitor.js — Ops Feature #1: is the system actually healthy?
 *
 * A SaaS that silently breaks loses customers before the founder notices. This runs a registry of
 * named health checks (WhatsApp connected? AI reachable? queue ok? disk ok?) and rolls them up into
 * one status. When the status WORSENS (ok -> degraded/down), it fires an alert via an injected
 * notifier so the owner hears about it first.
 *
 * Checks are injected functions returning { ok:boolean, status?:'ok'|'degraded'|'down', detail? }.
 * No storage needed — health is live; we just cache the last roll-up.
 */

const checks = new Map();   // name -> async () => { ok, status?, detail? }
let notifier = null;        // async (status, summary) => void   (e.g. WhatsApp the owner)
let lastStatus = 'unknown';
let lastResult = null;

function registerCheck(name, fn) { if (name && typeof fn === 'function') checks.set(name, fn); return [...checks.keys()]; }
function setNotifier(fn) { notifier = typeof fn === 'function' ? fn : null; }

const RANK = { ok: 0, degraded: 1, down: 2, unknown: 1 };
function worst(a, b) { return RANK[b] > RANK[a] ? b : a; }

async function runOne(name, fn) {
  const started = Date.now();
  try {
    const r = await fn();
    const status = r && r.status ? r.status : (r && r.ok ? 'ok' : 'down');
    return { name, status, detail: (r && r.detail) || null, ms: Date.now() - started };
  } catch (e) {
    return { name, status: 'down', detail: e.message, ms: Date.now() - started };
  }
}

/** Run all checks, roll up to one status, alert on worsening. */
async function runAll() {
  const results = [];
  let rollup = 'ok';
  for (const [name, fn] of checks.entries()) {
    const r = await runOne(name, fn);
    results.push(r);
    rollup = worst(rollup, r.status);
  }
  if (!checks.size) rollup = 'unknown';

  const summary = { status: rollup, checks: results, at: new Date().toISOString() };

  // alert only when things get WORSE (avoid spam on every tick)
  if (RANK[rollup] > RANK[lastStatus] && notifier) {
    try { await notifier(rollup, summary); } catch { /* never throw from health */ }
  }
  lastStatus = rollup;
  lastResult = summary;
  return summary;
}

/** Fast read of the last roll-up (for a /health endpoint that shouldn't run checks every hit). */
function lastSnapshot() {
  return lastResult || { status: lastStatus, checks: [], at: null };
}

module.exports = { registerCheck, setNotifier, runAll, lastSnapshot };
