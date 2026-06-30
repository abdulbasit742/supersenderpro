// lib/alertCenter/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const ruleStore = require('./ruleStore');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.rules) && Array.isArray(d.feed));
 ok('rules_seeded', ruleStore.all().length >= 1, 'default rules available');
 ok('owner_delivery_safe_default', config.effective.liveDelivery === false || config.liveDelivery === true,
 config.effective.liveDelivery ? 'live owner delivery enabled' : 'owner delivery draft-only (safe)');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, liveDelivery: config.effective.liveDelivery, defaultThrottleMinutes: config.defaultThrottleMinutes },
 counts: { rules: d.rules.length, feed: d.feed.length, unread: d.feed.filter((a) => !a.read).length },
 checks,
 };
}

module.exports = { run };
