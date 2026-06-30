'use strict';
/**
 * lib/webhooks/deliveryLog.js - record + inspect + replay outbound webhook deliveries.
 * Signed delivery (#298) sends but kept no audit trail. This stores each attempt per tenant so
 * you can see what was delivered, debug failures, and manually replay.
 *
 * Replay re-sends through signedDelivery, wrapped in the circuit breaker (#325) per destination
 * host so a dead endpoint isn't hammered.
 */
const repo = require('../db');
let signed = null; try { signed = require('./signedDelivery'); } catch {}
let cb = null; try { cb = require('../stability/circuitBreaker'); } catch {}
const COLLECTION = 'webhook_deliveries';
const nowISO = () => new Date().toISOString();

function hostOf(url) { try { return new URL(url).host; } catch { return 'unknown'; } }

async function record(tenantId, { url, event, payload, result } = {}) {
  repo.assertTenant(tenantId);
  return repo.create(tenantId, COLLECTION, {
    url, host: hostOf(url), event: event || (payload && payload.type) || 'event',
    status: result && result.ok ? 'delivered' : (result && result.dryRun ? 'prepared' : 'failed'),
    httpStatus: result ? result.status : null, attempts: result ? result.attempts : 0,
    payload: payload || null, at: nowISO(),
  });
}

// Deliver AND log in one call (wrap circuit breaker per host).
async function deliverAndLog(tenantId, url, payload, opts = {}) {
  if (!signed) throw new Error('signedDelivery unavailable');
  const key = 'webhook:' + hostOf(url);
  const run = () => signed.deliver(url, payload, opts);
  let result;
  try { result = cb ? await cb.wrap(key, run) : await run(); }
  catch (e) { result = { ok: false, status: 0, attempts: 0, error: e.message, circuitOpen: e.code === 'CIRCUIT_OPEN' }; }
  await record(tenantId, { url, event: opts.event, payload, result });
  return result;
}

async function list(tenantId, filter = {}) {
  repo.assertTenant(tenantId);
  let rows = await repo.list(tenantId, COLLECTION, {});
  if (filter.status) rows = rows.filter((r) => r.status === filter.status);
  if (filter.host) rows = rows.filter((r) => r.host === filter.host);
  rows.sort((a, b) => new Date(b.at) - new Date(a.at));
  return rows.slice(0, Math.min(Number(filter.limit || 100), 500));
}

async function replay(tenantId, id, opts = {}) {
  repo.assertTenant(tenantId);
  const row = await repo.get(tenantId, COLLECTION, id);
  if (!row) return null;
  const result = await deliverAndLog(tenantId, row.url, row.payload || { event: row.event }, Object.assign({ event: row.event }, opts));
  return { replayedFrom: id, result };
}

module.exports = { record, deliverAndLog, list, replay, COLLECTION };
