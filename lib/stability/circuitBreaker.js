'use strict';
/**
 * lib/stability/circuitBreaker.js - classic circuit breaker for outbound dependencies.
 * Stops hammering a downstream that's failing: after N consecutive failures the circuit OPENS
 * (calls fail fast) for a cool-down, then HALF-OPENs to test with one trial call; success CLOSES it.
 *
 * Per-key (e.g. one breaker per webhook host / provider). Dependency-free, in-process.
 * Pairs with signed webhooks (#298) and notify (#322) to protect outbound delivery.
 */
const breakers = new Map(); // key -> state

function getState(key) {
  let s = breakers.get(key);
  if (!s) { s = { state: 'closed', failures: 0, openedAt: 0, successes: 0 }; breakers.set(key, s); }
  return s;
}

function config() {
  return {
    threshold: Number(process.env.CB_FAILURE_THRESHOLD || 5),
    cooldownMs: Number(process.env.CB_COOLDOWN_MS || 30000),
    halfOpenTrials: Number(process.env.CB_HALFOPEN_TRIALS || 1),
  };
}

// Can we attempt a call right now?
function canRequest(key) {
  const s = getState(key); const c = config();
  if (s.state === 'open') {
    if (Date.now() - s.openedAt >= c.cooldownMs) { s.state = 'half-open'; s.successes = 0; return true; }
    return false;
  }
  return true; // closed or half-open
}

function onSuccess(key) {
  const s = getState(key);
  if (s.state === 'half-open') { s.successes += 1; if (s.successes >= config().halfOpenTrials) { s.state = 'closed'; s.failures = 0; } }
  else { s.failures = 0; }
}

function onFailure(key) {
  const s = getState(key); const c = config();
  s.failures += 1;
  if (s.state === 'half-open' || s.failures >= c.threshold) { s.state = 'open'; s.openedAt = Date.now(); }
}

// Wrap an async fn with the breaker. Throws a fast error when open.
async function wrap(key, fn) {
  if (!canRequest(key)) { const e = new Error('circuit open for ' + key); e.code = 'CIRCUIT_OPEN'; throw e; }
  try { const r = await fn(); onSuccess(key); return r; }
  catch (e) { onFailure(key); throw e; }
}

function snapshot() {
  const out = {};
  for (const [k, s] of breakers) out[k] = { state: s.state, failures: s.failures };
  return out;
}

function reset(key) { if (key) breakers.delete(key); else breakers.clear(); }

module.exports = { canRequest, onSuccess, onFailure, wrap, getState, snapshot, reset, config };
