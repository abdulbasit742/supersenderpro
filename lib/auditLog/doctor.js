// lib/auditLog/doctor.js — Offline self-check + posture. Includes a live chain verification so the
// status endpoint surfaces tampering immediately.

const { config } = require('./config');
const store = require('./store');
const { verify } = require('./hashChain');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.records));
 const v = verify(d.records, d.anchorHash);
 ok('chain_intact', v.valid, v.valid ? `verified ${v.length} records` : `BROKEN at index ${v.brokenAt} (record ${v.recordId})`);
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, maxRecords: config.maxRecords, logReadsToo: config.logReadsToo },
 integrity: v,
 counts: { records: d.records.length },
 checks,
 };
}

module.exports = { run };
