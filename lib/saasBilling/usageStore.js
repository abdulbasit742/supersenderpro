// lib/saasBilling/usageStore.js — Append-only-ish store for usage events.
// Caps total stored events at config.maxUsageEvents (oldest trimmed). Never stores
// message bodies, customer data, or secrets — only counters and metadata.

const { config } = require('./config');
const store = require('./store');

function _load() {
  const d = store.readJSON(config.paths.usage, null) || {};
  if (!Array.isArray(d.events)) d.events = [];
  return d;
}
function _save(d) { return store.writeJSON(config.paths.usage, d); }

function append(event) {
  const d = _load();
  d.events.push(event);
  // trim oldest to respect the cap
  if (d.events.length > config.maxUsageEvents) {
    d.events = d.events.slice(d.events.length - config.maxUsageEvents);
  }
  _save(d);
  return event;
}

function all() { return _load().events; }

function forTenant(tenantId) {
  const tid = String(tenantId);
  return all().filter((e) => String(e.tenantId) === tid);
}

module.exports = { append, all, forTenant };
