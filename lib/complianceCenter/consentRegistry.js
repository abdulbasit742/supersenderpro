// lib/complianceCenter/consentRegistry.js — Cross-channel consent registry.
// Unifies this center's own records with the existing Voice AI consent store (read-only),
// so the owner sees one consent view across WhatsApp, voice, and marketing. Stores masked only.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./store');
const audit = require('./auditLog');

const CHANNELS = ['whatsapp', 'voice', 'marketing', 'email', 'sms'];

function _load(){ return readJSON(config.paths.registry, { records: {} }); }
function _save(d){ return writeJSON(config.paths.registry, d); }

function defaults(subjectId){
  return { subjectId, channels: { whatsapp:false, voice:false, marketing:false, email:false, sms:false },
    optedOut:false, updatedAt:null, source:'default' };
}

// Merge in Voice AI consent (read-only) if present, so voice channel reflects existing opt-in.
function _withVoice(rec){
  const v = readJSON(config.paths.voiceConsent, { records:{} });
  const vr = v.records && v.records[rec.subjectId];
  if (vr) { rec = { ...rec, channels: { ...rec.channels, voice: !!vr.voiceMessagesOptIn } }; }
  return rec;
}

function get(subjectId){
  const d=_load(); const rec = (d.records && d.records[subjectId]) || defaults(subjectId);
  return _withVoice(rec);
}
function set(subjectId, channels={}, source='api'){
  const d=_load(); d.records=d.records||{}; const cur=d.records[subjectId]||defaults(subjectId);
  const next={...cur, channels:{...cur.channels, ...channels}, optedOut:false, updatedAt:new Date().toISOString(), source};
  d.records[subjectId]=next; _save(d); audit.record('consent_updated',{subjectId, source}); return _withVoice(next);
}
function all(){ const d=_load(); return Object.values(d.records||{}).map(_withVoice); }

module.exports = { get, set, all, defaults, CHANNELS };
