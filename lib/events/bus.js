'use strict';
/**
 * lib/events/bus.js - one place to emit a domain event and have it reach everything that cares.
 *
 * emit(tenantId, event, payload) does, best-effort and non-blocking:
 *   1. in-process subscribers (on(event, fn)) - for same-process reactions
 *   2. outbound webhook fan-out to subscribed tenant endpoints (#343 -> signed #298 + logged #336)
 *   3. an audit-log entry (#296)
 *   4. a Prometheus counter bump (#312)
 *
 * No sink can break the caller: each is wrapped. This means a domain action (e.g. deal won)
 * emits ONCE and the webhook/audit/metric wiring happens consistently instead of being
 * re-implemented at every call site.
 */
let webhookEndpoints = null; try { webhookEndpoints = require('../webhooks/endpoints'); } catch {}
let audit = null; try { audit = require('../audit'); } catch {}
let metrics = null; try { metrics = require('../observability/metrics'); } catch {}
let logger = console; try { logger = require('../observability/logger'); } catch {}

const subscribers = new Map(); // event -> Set<fn>

function on(event, fn) {
  if (!subscribers.has(event)) subscribers.set(event, new Set());
  subscribers.get(event).add(fn);
  return () => subscribers.get(event) && subscribers.get(event).delete(fn);
}

function _notifyLocal(event, tenantId, payload) {
  for (const ev of [event, '*']) {
    const set = subscribers.get(ev);
    if (!set) continue;
    for (const fn of set) { try { Promise.resolve(fn({ event, tenantId, payload })).catch(() => {}); } catch {} }
  }
}

// Emit a domain event. Returns a summary of which sinks ran (useful for tests).
async function emit(tenantId, event, payload = {}, opts = {}) {
  if (!tenantId || !event) throw new Error('emit(tenantId, event, payload) requires tenantId + event');
  const sinks = { local: false, webhook: null, audit: false, metric: false };

  // 1) local subscribers
  try { _notifyLocal(event, tenantId, payload); sinks.local = true; } catch {}

  // 2) webhook fan-out (skip if opts.webhook === false)
  if (webhookEndpoints && opts.webhook !== false) {
    try { sinks.webhook = await webhookEndpoints.fanout(tenantId, event, payload); } catch (e) { sinks.webhook = { error: e.message }; }
  }

  // 3) audit (skip noisy events via opts.audit === false)
  if (audit && opts.audit !== false) {
    try { await audit.record(tenantId, 'event.' + event, opts.actor || null, { payloadKeys: Object.keys(payload || {}) }); sinks.audit = true; } catch {}
  }

  // 4) metric
  if (metrics) { try { metrics.inc('domain_events_total', { event }); sinks.metric = true; } catch {} }

  (logger.info ? logger.info({ msg: 'event_emitted', event, tenantId, webhookDelivered: sinks.webhook && sinks.webhook.delivered }) : null);
  return { event, tenantId, sinks };
}

module.exports = { emit, on, subscribers };
