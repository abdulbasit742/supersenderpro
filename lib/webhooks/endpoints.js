'use strict';
/**
 * lib/webhooks/endpoints.js - manage a tenant's outbound webhook endpoints + fan out events.
 * Completes the webhook story: signing (#298) + delivery log/replay (#336) existed, but there
 * was no way to register WHERE events go or to broadcast an event to all subscribers.
 *
 * Each endpoint has a URL, a list of subscribed events (or ['*']), an auto-generated signing
 * secret (returned once at create), and active flag. fanout() signs+delivers+logs to every active
 * endpoint subscribed to the event, wrapped in the circuit breaker per host.
 */
const crypto = require('crypto');
const repo = require('../db');
let log = null; try { log = require('./deliveryLog'); } catch {}
const COLLECTION = 'webhook_endpoints';

const publicView = (e) => (e ? { id: e.id, url: e.url, events: e.events || ['*'], active: e.active !== false, hasSecret: !!e.secret, createdAt: e.createdAt } : null);

async function create(tenantId, { url, events } = {}) {
  repo.assertTenant(tenantId);
  if (!url || !/^https?:\/\//.test(url)) throw new Error('valid http(s) url required');
  const secret = 'whsec_' + crypto.randomBytes(20).toString('hex');
  const e = await repo.create(tenantId, COLLECTION, { url, events: Array.isArray(events) && events.length ? events : ['*'], active: true, secret });
  // secret returned ONCE
  return Object.assign(publicView(e), { secret });
}

async function list(tenantId) { repo.assertTenant(tenantId); return (await repo.list(tenantId, COLLECTION, {})).map(publicView); }

async function update(tenantId, id, patch = {}) {
  repo.assertTenant(tenantId);
  const allowed = {};
  if (patch.url !== undefined) { if (!/^https?:\/\//.test(patch.url)) throw new Error('valid http(s) url required'); allowed.url = patch.url; }
  if (patch.events !== undefined) allowed.events = Array.isArray(patch.events) ? patch.events : ['*'];
  if (patch.active !== undefined) allowed.active = !!patch.active;
  const e = await repo.update(tenantId, COLLECTION, id, allowed);
  return publicView(e);
}

async function rotateSecret(tenantId, id) {
  repo.assertTenant(tenantId);
  const secret = 'whsec_' + crypto.randomBytes(20).toString('hex');
  const e = await repo.update(tenantId, COLLECTION, id, { secret });
  return e ? Object.assign(publicView(e), { secret }) : null;
}

async function remove(tenantId, id) { repo.assertTenant(tenantId); return repo.remove(tenantId, COLLECTION, id); }

function subscribed(endpoint, event) { const ev = endpoint.events || ['*']; return ev.includes('*') || ev.includes(event); }

// Deliver an event to every active subscribed endpoint. Returns per-endpoint results.
async function fanout(tenantId, event, payload) {
  repo.assertTenant(tenantId);
  const eps = (await repo.list(tenantId, COLLECTION, {})).filter((e) => e.active !== false && subscribed(e, event));
  const results = [];
  for (const e of eps) {
    const body = { event, data: payload, tenantId, at: new Date().toISOString() };
    let result;
    if (log) result = await log.deliverAndLog(tenantId, e.url, body, { secret: e.secret, event });
    else result = { ok: false, error: 'deliveryLog unavailable' };
    results.push({ endpointId: e.id, url: e.url, ok: !!result.ok, status: result.status, dryRun: !!result.dryRun });
  }
  return { event, delivered: results.length, results };
}

module.exports = { create, list, update, rotateSecret, remove, fanout, subscribed, COLLECTION };
