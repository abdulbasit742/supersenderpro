// lib/inboundWebhooks/endpointStore.js — Register + manage inbound endpoints. Each endpoint has a
// unique slug (the public path segment), a source name, a signature scheme + secret (returned once
// on create), a header config, and a payload->event mapping. Endpoints are deactivated, never
// hard-deleted. Secrets are never returned in views after creation.

const crypto = require('crypto');
const store = require('./store');
const { SIG_SCHEMES } = require('./config');

function _slug(name) { return String(name || 'hook').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'hook'; }
function _maskSecret(s) { if (!s) return null; const v = String(s); return v.length <= 6 ? '****' : v.slice(0, 3) + '****' + v.slice(-2); }

function publicView(e) {
 if (!e) return null;
 return { id: e.id, slug: e.slug, source: e.source, scheme: e.scheme, signatureHeader: e.signatureHeader || null, timestampHeader: e.timestampHeader || null, secretMasked: _maskSecret(e.secret), mapping: e.mapping || null, active: e.active, eventsReceived: e.eventsReceived || 0, lastEventAt: e.lastEventAt || null, createdAt: e.createdAt };
}

function create({ source, scheme = 'hmac_sha256', secret, signatureHeader, timestampHeader, mapping, slug } = {}) {
 if (!SIG_SCHEMES.includes(scheme)) throw new Error('scheme must be one of: ' + SIG_SCHEMES.join(', '));
 if (scheme !== 'unsigned' && !secret) secret = crypto.randomBytes(20).toString('hex');
 const d = store.load();
 let theSlug = slug ? _slug(slug) : _slug(source);
 let guard = 0; while (d.endpoints.some((e) => e.slug === theSlug) && guard < 20) { theSlug = `${_slug(source)}-${Math.random().toString(36).slice(2, 6)}`; guard += 1; }
 const rec = {
 id: store.genId('iep'), slug: theSlug, source: String(source || 'source'),
 scheme, secret: scheme === 'unsigned' ? null : String(secret),
 signatureHeader: signatureHeader || (scheme === 'token' ? 'x-webhook-token' : 'x-signature'),
 timestampHeader: timestampHeader || null,
 mapping: mapping || { event: 'webhook.received', fields: {} },
 active: true, eventsReceived: 0, lastEventAt: null, createdAt: store.nowIso(),
 };
 d.endpoints.push(rec); store.save(d);
 return { endpoint: publicView(rec), secret: rec.secret, url: `/_in/${rec.slug}` };
}

function all() { return store.load().endpoints.map(publicView); }
function getBySlug(slug) { return store.load().endpoints.find((e) => e.slug === slug) || null; }
function getById(id) { return store.load().endpoints.find((e) => e.id === id) || null; }
function setActive(id, active) { const d = store.load(); const e = d.endpoints.find((x) => x.id === id); if (!e) throw new Error('endpoint not found'); e.active = !!active; store.save(d); return publicView(e); }
function setMapping(id, mapping) { const d = store.load(); const e = d.endpoints.find((x) => x.id === id); if (!e) throw new Error('endpoint not found'); e.mapping = mapping || e.mapping; store.save(d); return publicView(e); }

module.exports = { create, all, getBySlug, getById, setActive, setMapping, publicView };
