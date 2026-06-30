// lib/auditLog/index.js — Audit Log: tamper-evident activity trail (barrel export).
//
// Append-only activity records (actor, action, target, metadata, ip, status) linked in a SHA-256
// hash chain, so any edit or deletion of a past record breaks verification and is detectable.
// Includes an Express middleware to auto-log mutating API calls, verify() to prove integrity,
// filtered queries, stats, and CSV export.
//
// SAFETY: JSON-backed, append-only. Metadata is REDACTED at ingest (secrets dropped, phone/email
// masked). Logging never throws into the request path. Trimming re-anchors the chain so the
// retained tail still verifies.

const { config } = require('./config');
const logger = require('./logger');

module.exports = {
 config,
 store: require('./store'),
 redact: require('./redact').redact,
 hashChain: require('./hashChain'),
 logger,
 record: logger.record,
 middleware: require('./middleware'),
 auditMiddleware: require('./middleware').auditMiddleware,
 query: require('./query'),
 doctor: require('./doctor'),
};
