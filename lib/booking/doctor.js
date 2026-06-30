// lib/booking/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, STATUSES } = require('./config');
const store = require('./store');

function _present(name) { try { require('../' + name); return true; } catch (_e) { return false; } }

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.services) && Array.isArray(d.appointments));
 ok('messages_safe_default', config.effective.liveMessages === false || config.liveMessages === true, config.effective.liveMessages ? 'live messages enabled' : 'draft-only (safe)');
 ok('lead_and_granularity_sane', config.minLeadMins >= 0 && config.slotGranularityMins > 0);
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, liveMessages: config.effective.liveMessages, timezone: config.timezone, slotGranularityMins: config.slotGranularityMins, minLeadMins: config.minLeadMins, reminderHoursBefore: config.reminderHoursBefore, respectConsent: config.respectConsent, statuses: STATUSES, consentWired: _present('consentCenter'), customer360Wired: _present('customer360') },
 counts: { services: d.services.length, appointments: d.appointments.length },
 checks,
 };
}

module.exports = { run };
