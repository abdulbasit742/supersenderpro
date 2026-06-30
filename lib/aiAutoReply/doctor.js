// lib/aiAutoReply/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const llmBridge = require('./llmBridge');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.replies) && Array.isArray(d.faqs));
 ok('send_safe_default', config.effective.liveSend === false || config.liveSend === true,
 config.effective.liveSend ? 'live send explicitly enabled' : 'suggest-only (safe)');
 ok('confidence_valid', config.minConfidence >= 0 && config.minConfidence <= 1);
 ok('business_hours_valid', config.businessStartHour >= 0 && config.businessStartHour <= 23 && config.businessEndHour >= 0 && config.businessEndHour <= 23);
 return {
 ok: checks.every((c) => c.pass),
 posture: {
 enabled: config.enabled,
 killSwitch: config.killSwitch,
 liveSend: config.effective.liveSend,
 minConfidence: config.minConfidence,
 businessHours: `${config.businessStartHour}:00-${config.businessEndHour}:00`,
 hubAvailable: llmBridge.hubAvailable(),
 },
 counts: { replies: d.replies.length, faqs: d.faqs.length },
 checks,
 };
}

module.exports = { run };
