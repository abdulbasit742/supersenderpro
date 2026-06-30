// lib/apiGateway/webhookSubscriptions.js — Manage outbound webhook subscriptions. A subscription
// is { url, events:[...], secret (for HMAC signing, stored to sign deliveries), active }. The
// signing secret is masked in views but retained server-side so we can sign outgoing payloads.

const crypto = require('crypto');
const store = require('./store');

const KNOWN_EVENTS = ['message.received', 'message.sent', 'payment.succeeded', 'ticket.created', 'ticket.resolved', 'contact.created', 'campaign.completed', '*'];

function _mask(s) { if (!s) return null; const v = String(s); return v.length <= 6 ? '****' : v.slice(0, 3) + '****' + v.slice(-2); }

function publicView(s) {
 if (!s) return null;
 return { id: s.id, url: s.url, events: s.events, active: s.active, secretMasked: _mask(s.secret), ownerTenantId: s.ownerTenantId, createdAt: s.createdAt, updatedAt: s.updatedAt };
}

function _validEvents(events) {
 const list = Array.isArray(events) && events.length ? events : ['*'];
 const bad = list.filter((e) => !KNOWN_EVENTS.includes(e));
 if (bad.length) throw new Error('unknown event(s): ' + bad.join(', '));
 return list;
}

function create({ url, events, secret, ownerTenantId = 'default' } = {}) {
 if (!url || !/^https?:\/\//.test(String(url))) throw new Error('a valid http(s) url is required');
 const validEvents = _validEvents(events);
 const d = store.load();
 const rec = {
 id: store.genId('whs'), url: String(url), events: validEvents,
 secret: secret ? String(secret) : crypto.randomBytes(16).toString('hex'),
 active: true, ownerTenantId: String(ownerTenantId),
 createdAt: store.nowIso(), updatedAt: store.nowIso(),
 };
 d.subscriptions.push(rec); store.save(d);
 // Return the signing secret once so the integrator can store it for verification.
 return { subscription: publicView(rec), signingSecret: rec.secret };
}

function all() { return store.load().subscriptions.map(publicView); }
function getById(id) { return publicView(store.load().subscriptions.find((s) => s.id === id)); }
function rawById(id) { return store.load().subscriptions.find((s) => s.id === id) || null; }
function forEvent(event) {
 return store.load().subscriptions.filter((s) => s.active && (s.events.includes('*') || s.events.includes(event)));
}
function setActive(id, active) {
 const d = store.load(); const s = d.subscriptions.find((x) => x.id === id);
 if (!s) throw new Error('subscription not found');
 s.active = !!active; s.updatedAt = store.nowIso(); store.save(d);
 return publicView(s);
}
function remove(id) { const d = store.load(); d.subscriptions = d.subscriptions.filter((s) => s.id !== id); store.save(d); return true; }

module.exports = { create, all, getById, rawById, forEvent, setActive, remove, publicView, KNOWN_EVENTS };
