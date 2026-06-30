// lib/auditLog/logger.js — Append-only writer. record({ actor, action, target, metadata, ip, status })
// redacts metadata, links the new record into the hash chain, trims to maxRecords (re-anchoring
// the chain on trim so the retained tail still verifies), and persists atomically.

const store = require('./store');
const { config } = require('./config');
const { redact } = require('./redact');
const { computeHash } = require('./hashChain');

function record({ actor = 'system', action, target = null, metadata = {}, ip = null, status = 'ok' } = {}) {
 if (!config.enabled) return null;
 if (!action) throw new Error('action is required');
 const d = store.load();
 const prevHash = d.records.length ? d.records[d.records.length - 1].hash : d.anchorHash;
 const base = {
 id: store.genId('aud'),
 at: store.nowIso(),
 actor: String(actor).slice(0, 80),
 action: String(action).slice(0, 80),
 target: target ? String(target).slice(0, 160) : null,
 status: String(status).slice(0, 24),
 ip: ip ? String(ip).slice(0, 64) : null,
 metadata: redact(metadata || {}),
 prevHash,
 };
 base.hash = computeHash(prevHash, base);
 d.records.push(base);
 // Trim oldest while re-anchoring so the retained tail keeps verifying.
 if (d.records.length > config.maxRecords) {
 const removeCount = d.records.length - config.maxRecords;
 d.anchorHash = d.records[removeCount - 1].hash; // last removed record's hash becomes the new anchor
 d.records = d.records.slice(removeCount);
 }
 store.save(d);
 return base;
}

module.exports = { record };
