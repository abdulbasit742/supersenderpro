// lib/inboundWebhooks/index.js — Inbound Webhook Ingestion (barrel export).
//
// Register inbound endpoints (per-source shared secret + signature scheme), VERIFY incoming
// third-party webhooks (HMAC-SHA256 or token), MAP raw provider payloads to a normalized internal
// event via a SAFE field-path mapping (no eval), DEDUPE redelivered events by source + external id,
// and FAN the normalized event into the automation engine #48 and (optionally) the alert center
// #28. This is the inbound counterpart to the outbound webhooks in the API gateway #20.
//
// SAFETY: JSON-backed; this module never sends. Signatures verified by default (unsigned must be
// explicit). Raw request bodies are NOT stored (only the normalized event + which keys it had).
// Endpoint secrets never returned after creation. Missing fan-out depts degrade to no-op.

const { config, SIG_SCHEMES } = require('./config');

module.exports = {
 config, SIG_SCHEMES,
 store: require('./store'),
 verify: require('./verify'),
 mapper: require('./mapper'),
 endpointStore: require('./endpointStore'),
 ingestEngine: require('./ingestEngine'),
 doctor: require('./doctor'),
 // convenience
 ingest: require('./ingestEngine').ingest,
};
