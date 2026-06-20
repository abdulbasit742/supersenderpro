// lib/complianceCenter/policyChecker.js — Decides whether an action is allowed for a subject.
// Fails safe (deny) when consent is missing. Pure decision logic; performs no sending.

const { config } = require('./config');
const registry = require('./consentRegistry');
const optOut = require('./optOutManager');

function _inQuietHours(now = new Date()){
  // Compare HH:MM in configured window (handles overnight window).
  const hhmm = now.toTimeString().slice(0,5);
  const s = config.quietHoursStart, e = config.quietHoursEnd;
  if (s <= e) return hhmm >= s && hhmm < e;
  return hhmm >= s || hhmm < e; // overnight
}

function canContact(subjectId, channel='whatsapp', { ignoreQuietHours=false } = {}){
  const reasons=[];
  if (optOut.isOptedOut(subjectId)) return { allowed:false, reason:'opted_out' };
  const rec = registry.get(subjectId);
  const consented = !!(rec.channels && rec.channels[channel]);
  if (config.consentFirst && !consented) return { allowed:false, reason:`no_consent_for_${channel}` };
  if (!ignoreQuietHours && _inQuietHours()) { reasons.push('quiet_hours'); return { allowed:false, reason:'quiet_hours' }; }
  return { allowed:true, reason:'ok' };
}

module.exports = { canContact, _inQuietHours };
