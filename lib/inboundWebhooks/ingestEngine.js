// lib/inboundWebhooks/ingestEngine.js — The core. ingest(slug, rawBody, headers) looks up the
// endpoint, verifies the signature, parses JSON, dedupes by source + external id, maps the payload
// to a normalized internal event, records a (body-free) log entry, and fans the event into the
// automation engine #48 and (optionally) the alert center #28. Returns a result the route turns
// into 200/400/401/409. Never throws to the route.

const store = require('./store');
const { config } = require('./config');
const endpointStore = require('./endpointStore');
const verifier = require('./verify');
const mapper = require('./mapper');

let automation = null; try { automation = require('../automationRules'); } catch (_e) { automation = null; }
let alerts = null; try { alerts = require('../alertCenter'); } catch (_e) { alerts = null; }

const MIN = 60 * 1000;

function _externalId(payload, mapping) {
 // Prefer a mapped externalId field, else common provider id keys.
 if (mapping && mapping.externalIdPath) { const v = mapper._get(payload, mapping.externalIdPath); if (v) return String(v); }
 return String(payload && (payload.id || payload.event_id || payload.eventId || (payload.data && payload.data.id)) || '');
}

async function ingest(slug, rawBody, headers = {}) {
 if (!config.enabled) return { status: 503, ok: false, reason: 'ingestion disabled' };
 const ep = endpointStore.getBySlug(slug);
 if (!ep) return { status: 404, ok: false, reason: 'unknown endpoint' };
 if (!ep.active) return { status: 403, ok: false, reason: 'endpoint inactive' };

 // Lowercase headers for consistent lookups.
 const h = {}; for (const [k, v] of Object.entries(headers || {})) h[String(k).toLowerCase()] = v;

 const ver = verifier.verify(ep, rawBody, h);
 if (!ver.verified) return { status: 401, ok: false, reason: 'signature verification failed (' + ver.scheme + ')' };

 let payload; try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch (_e) { return { status: 400, ok: false, reason: 'invalid JSON body' }; }

 // Dedupe redelivered events by source + external id within the window.
 const extId = _externalId(payload, ep.mapping);
 const dedupeKey = `${ep.slug}:${extId}`;
 const d = store.load();
 if (extId) {
 const seenAt = d.seen[dedupeKey];
 if (seenAt && (Date.now() - Date.parse(seenAt)) < config.dedupeWindowMinutes * MIN) {
 return { status: 409, ok: true, duplicate: true, reason: 'duplicate event ignored', externalId: extId };
 }
 }

 const normalized = mapper.apply(ep.mapping, payload);

 // Record a body-FREE log entry (we keep the normalized event + which keys were present, not the raw body).
 const logEntry = { id: store.genId('iev'), slug: ep.slug, source: ep.source, event: normalized.event, externalId: extId || null, at: store.nowIso(), normalizedKeys: Object.keys(normalized) };
 d.events.push(logEntry);
 if (d.events.length > config.maxEventLog) d.events = d.events.slice(-config.maxEventLog);
 if (extId) d.seen[dedupeKey] = store.nowIso();
 const epRaw = d.endpoints.find((e) => e.id === ep.id);
 if (epRaw) { epRaw.eventsReceived = (epRaw.eventsReceived || 0) + 1; epRaw.lastEventAt = store.nowIso(); }
 store.save(d);

 // Fan out (best-effort, non-fatal).
 const fan = {};
 if (config.fanToAutomation && automation) { try { fan.automation = await automation.emit(normalized.event, normalized); } catch (e) { fan.automationError = e.message; } }
 if (config.fanToAlerts && alerts) { try { fan.alerts = await alerts.emit(normalized.event, normalized); } catch (e) { fan.alertsError = e.message; } }

 return { status: 200, ok: true, event: normalized.event, externalId: extId || null, normalized, fan };
}

function events(limit = 100, slug = null) {
 let items = store.load().events.slice();
 if (slug) items = items.filter((e) => e.slug === slug);
 return items.slice(-limit).reverse();
}
function overview() {
 const d = store.load();
 return {
 generatedAt: store.nowIso(),
 fanToAutomation: config.fanToAutomation && !!automation,
 fanToAlerts: config.fanToAlerts && !!alerts,
 cards: { endpoints: d.endpoints.length, active: d.endpoints.filter((e) => e.active).length, eventsLogged: d.events.length },
 };
}

module.exports = { ingest, events, overview };
