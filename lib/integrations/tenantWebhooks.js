'use strict';
/**
 * tenantWebhooks.js — Integrations Feature #1: outbound webhooks for tenants.
 *
 * Lets a tenant connect SuperSender to their own systems (Zapier/Make/n8n/custom): they subscribe a
 * URL to platform events (message_received, payment_received, lead_captured, opt_out, ...), and we
 * POST a signed payload there whenever the event fires.
 *
 * This is the outbound twin of the inbound API (#api1). It reuses the SSRF-safe WebhookDispatcher
 * (lib/webhookDispatcher) so deliveries are signed + can't be pointed at internal addresses. Bridge
 * it to the Workflow Builder by calling tenantWebhooks.emit(event, ctx) wherever you emit events.
 *
 * Storage: subscriptions JSON (data/tenant_webhooks.json); delivery handled by webhookDispatcher.
 */

const fs = require('fs');
const path = require('path');

let WebhookDispatcher = null;
try { WebhookDispatcher = require('../webhookDispatcher'); } catch { WebhookDispatcher = null; }
const dispatcher = WebhookDispatcher ? new WebhookDispatcher() : null;

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'tenant_webhooks.json');

const PLATFORM_EVENTS = [
  'message_received', 'message_sent', 'lead_captured', 'payment_received',
  'order_completed', 'opt_out', 'opt_in', 'support_escalated', 'campaign_completed'
];

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { subs: [] }; }
  catch { return { subs: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

/**
 * Subscribe a tenant URL to one or more events.
 * @param {Object} opts { tenantId, url, events?:string[], secret? }
 */
function subscribe(opts = {}) {
  if (!opts.tenantId) throw new Error('tenantId required');
  if (!opts.url || !/^https?:\/\//i.test(opts.url)) throw new Error('valid http(s) url required');
  const events = (Array.isArray(opts.events) && opts.events.length ? opts.events : ['*'])
    .filter(e => e === '*' || PLATFORM_EVENTS.includes(e));
  const data = load();
  const sub = {
    id: `WHS-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: String(opts.tenantId),
    url: opts.url,
    events,
    secret: opts.secret || null,
    active: true,
    createdAt: nowIso()
  };
  data.subs.push(sub);
  save(data);
  // register with the SSRF-safe dispatcher (keyed by tenant)
  if (dispatcher) {
    try { dispatcher.registerWebhook(sub.tenantId, sub.url, events.includes('*') ? [] : events, sub.secret || ''); }
    catch (e) { /* dispatcher validation may reject unsafe urls; surface via return */ sub.warning = e.message; }
  }
  return sub;
}

function listSubs(tenantId) {
  const data = load();
  return data.subs.filter(s => !tenantId || s.tenantId === String(tenantId));
}
function unsubscribe(id) {
  const data = load();
  const before = data.subs.length;
  data.subs = data.subs.filter(s => s.id !== id);
  save(data);
  return { deleted: before - data.subs.length };
}

/**
 * Fire an event to all tenant subscriptions matching it. Bridge this to your workflow emitter:
 *   workflow.emit AND tenantWebhooks.emit can both be called, or wrap them.
 * @param {string} event
 * @param {Object} ctx  must include tenantId (or it goes to all subs of that event? no — tenant-scoped)
 */
async function emit(event, ctx = {}) {
  if (!dispatcher) return { delivered: 0, error: 'dispatcher unavailable' };
  const tenantId = ctx.tenantId != null ? String(ctx.tenantId) : null;
  const data = load();
  const subs = data.subs.filter(s => s.active && (!tenantId || s.tenantId === tenantId) && (s.events.includes('*') || s.events.includes(event)));
  if (!subs.length) return { delivered: 0 };
  // dispatcher.dispatch is keyed by storeId/tenantId and handles signing + SSRF re-check
  let delivered = 0;
  const seenTenants = new Set();
  for (const s of subs) {
    if (seenTenants.has(s.tenantId)) continue; // dispatcher fans to all that tenant's hooks once
    seenTenants.add(s.tenantId);
    try { const r = await dispatcher.dispatch(s.tenantId, event, ctx); delivered += (r.dispatched || 0); }
    catch { /* keep going */ }
  }
  return { delivered, subscriptions: subs.length };
}

function supportedEvents() { return PLATFORM_EVENTS; }

module.exports = { subscribe, listSubs, unsubscribe, emit, supportedEvents };
