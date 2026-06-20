// lib/complianceCenter/config.js — Config for the Compliance & Consent Center.
// Consent-first. Local registry + safe reads of existing consent stores. No external calls.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def=false){ if(v===undefined||v===null||v==='') return def; return String(v).trim().toLowerCase()==='true'; }
function resolvePath(envVal, fallbackRel){
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}
const config = {
  enabled: bool(process.env.COMPLIANCE_ENABLED, true),
  consentFirst: bool(process.env.COMPLIANCE_CONSENT_FIRST, true),
  quietHoursStart: process.env.COMPLIANCE_QUIET_START || '22:00',
  quietHoursEnd: process.env.COMPLIANCE_QUIET_END || '08:00',
  timezone: process.env.COMPLIANCE_TIMEZONE || 'Asia/Karachi',
  paths: {
    root: ROOT, dataDir: DATA_DIR,
    registry: resolvePath(process.env.COMPLIANCE_REGISTRY_PATH, 'data/compliance-consent.json'),
    audit: resolvePath(process.env.COMPLIANCE_AUDIT_PATH, 'data/compliance-audit.json'),
    voiceConsent: path.join(DATA_DIR, 'voice-ai-consent.json'),
  },
};
module.exports = { config, bool, ROOT, DATA_DIR };
