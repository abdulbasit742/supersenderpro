// lib/apiGateway/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.keys) && Array.isArray(d.subscriptions) && Array.isArray(d.deliveries));
 ok('secrets_hashed', d.keys.every((k) => k.hash && !k.secret), d.keys.length ? 'all keys hashed, no plaintext' : 'no keys yet');
 ok('webhook_safe_default', config.effective.liveWebhookDelivery === false || config.liveWebhookDelivery === true,
 config.effective.liveWebhookDelivery ? 'live delivery enabled' : 'dry-run (safe)');
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 liveWebhookDelivery: config.effective.liveWebhookDelivery,
 defaultRateLimitPerMin: config.defaultRateLimitPerMin,
 maxWebhookRetries: config.maxWebhookRetries,
 },
 counts: {
 keys: d.keys.length, activeKeys: d.keys.filter((k) => k.status === 'active').length,
 subscriptions: d.subscriptions.length, deliveries: d.deliveries.length,
 dead: d.deliveries.filter((r) => r.status === 'dead').length,
 },
 checks,
 };
}

module.exports = { run };
