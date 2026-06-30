// lib/inboundWebhooks/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, SIG_SCHEMES } = require('./config');
const store = require('./store');
const verifier = require('./verify');
const mapper = require('./mapper');

function _present(name) { try { require('../' + name); return true; } catch (_e) { return false; } }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.endpoints) && Array.isArray(d.events));
 // HMAC verify round-trips for a known secret.
 const body = JSON.stringify({ id: 'evt_1', amount: 100 });
 const sig = verifier.hmacSha256('s3cr3t', body);
 const good = verifier.verify({ scheme: 'hmac_sha256', secret: 's3cr3t', signatureHeader: 'x-signature' }, body, { 'x-signature': sig });
 const bad = verifier.verify({ scheme: 'hmac_sha256', secret: 's3cr3t', signatureHeader: 'x-signature' }, body, { 'x-signature': 'deadbeef' });
 ok('hmac_verify', good.verified === true && bad.verified === false, 'valid signature accepted, bad rejected');
 // Mapper reads nested paths.
 const m = mapper.apply({ event: { path: 'type' }, fields: { contact: 'data.object.phone', amount: 'data.object.amount' } }, { type: 'payment.ok', data: { object: { phone: '+923001234567', amount: 2000 } } });
 ok('mapper_ok', m.event === 'payment.ok' && m.amount === 2000, 'mapping resolves event + nested fields');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, schemes: SIG_SCHEMES, fanToAutomation: config.fanToAutomation && _present('automationRules'), fanToAlerts: config.fanToAlerts && _present('alertCenter'), dedupeWindowMinutes: config.dedupeWindowMinutes },
 counts: { endpoints: d.endpoints.length, events: d.events.length },
 checks,
 };
}

module.exports = { run };
