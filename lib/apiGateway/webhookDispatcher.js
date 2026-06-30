// lib/apiGateway/webhookDispatcher.js — Emit events to subscribed webhooks. Each delivery payload
// is HMAC-SHA256 signed with the subscription's secret (header X-SuperSender-Signature) plus a
// timestamp, so receivers can verify authenticity. Delivery is DRY-RUN by default (recorded, no
// network). Failed live deliveries retry with exponential backoff up to maxWebhookRetries, then
// dead-letter. A pluggable HTTP sender keeps this dependency-free + testable.

const crypto = require('crypto');
const store = require('./store');
const { config } = require('./config');
const subs = require('./webhookSubscriptions');

let _sender = null; // async (url, bodyString, headers) => { status }
function setSender(fn) { _sender = (typeof fn === 'function') ? fn : null; return !!_sender; }

function sign(secret, timestamp, bodyString) {
 return crypto.createHmac('sha256', String(secret)).update(`${timestamp}.${bodyString}`).digest('hex');
}

// Emit an event: enqueue a delivery for every matching active subscription.
function emit(event, payload = {}) {
 const matching = subs.forEvent(event);
 const d = store.load();
 const created = [];
 for (const s of matching) {
 const rec = {
 id: store.genId('del'), subscriptionId: s.id, url: s.url, event,
 payload, status: 'pending', attempts: 0, nextAttemptAt: store.nowIso(),
 lastError: null, createdAt: store.nowIso(), updatedAt: store.nowIso(),
 };
 d.deliveries.push(rec); created.push(rec.id);
 }
 store.save(d);
 return { event, queued: created.length, deliveryIds: created };
}

async function _attempt(d, rec) {
 const sub = subs.rawById(rec.subscriptionId);
 if (!sub) { rec.status = 'dead'; rec.lastError = 'subscription gone'; return; }
 const ts = Date.now();
 const body = JSON.stringify({ event: rec.event, data: rec.payload, deliveryId: rec.id, at: new Date(ts).toISOString() });
 const signature = sign(sub.secret, ts, body);
 const headers = { 'Content-Type': 'application/json', 'X-SuperSender-Event': rec.event, 'X-SuperSender-Timestamp': String(ts), 'X-SuperSender-Signature': signature };
 rec.attempts += 1;

 if (!config.effective.liveWebhookDelivery || !_sender) {
 rec.status = 'dry_run'; rec.lastError = null; rec.signaturePreview = signature.slice(0, 12) + '...'; rec.updatedAt = store.nowIso();
 return;
 }
 try {
 const resp = await _sender(rec.url, body, headers);
 const status = resp && resp.status ? resp.status : 0;
 if (status >= 200 && status < 300) { rec.status = 'delivered'; rec.lastError = null; }
 else { throw new Error('non-2xx status: ' + status); }
 } catch (e) {
 rec.lastError = e.message;
 if (rec.attempts >= config.maxWebhookRetries) { rec.status = 'dead'; }
 else {
 rec.status = 'pending';
 const backoffSec = config.retryBaseSeconds * Math.pow(2, rec.attempts - 1);
 rec.nextAttemptAt = new Date(Date.now() + backoffSec * 1000).toISOString();
 }
 }
 rec.updatedAt = store.nowIso();
}

// Process due deliveries (pending + nextAttemptAt <= now). Returns a summary.
async function tick(refNow = Date.now()) {
 const d = store.load();
 const due = d.deliveries.filter((r) => (r.status === 'pending' || r.status === 'dry_run' && r.attempts === 0) && Date.parse(r.nextAttemptAt) <= refNow);
 let delivered = 0, retried = 0, dead = 0, dry = 0;
 for (const rec of due) {
 await _attempt(d, rec);
 if (rec.status === 'delivered') delivered += 1;
 else if (rec.status === 'dead') dead += 1;
 else if (rec.status === 'dry_run') dry += 1;
 else if (rec.status === 'pending') retried += 1;
 }
 store.save(d);
 return { processed: due.length, delivered, retried, dead, dryRun: dry };
}

function deliveries({ status, subscriptionId, limit = 100 } = {}) {
 let items = store.load().deliveries;
 if (status) items = items.filter((r) => r.status === status);
 if (subscriptionId) items = items.filter((r) => r.subscriptionId === subscriptionId);
 return items.slice(-limit).reverse().map((r) => ({ id: r.id, subscriptionId: r.subscriptionId, event: r.event, status: r.status, attempts: r.attempts, url: r.url, lastError: r.lastError, nextAttemptAt: r.nextAttemptAt, createdAt: r.createdAt }));
}

module.exports = { emit, tick, deliveries, sign, setSender };
