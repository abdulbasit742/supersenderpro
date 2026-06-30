// lib/consentCenter/config.js — Safe config for the Consent & Opt-Out Compliance department.
// JSON-backed like the rest of the app. This is a SAFETY module: the default posture is to
// SUPPRESS aggressively (opt-out wins) so the business can't message people who said stop. It
// never sends; it gates sends. Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function list(v, def) { const s = String(v == null ? '' : v).trim(); if (!s) return def; return s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean); }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.CONSENT_CENTER_ENABLED, true),
 // If true, a contact with UNKNOWN consent is allowed (opt-out model). If false, only opted-in
 // contacts can be messaged (opt-in model, stricter). Default: opt-out model (allow unknown).
 allowUnknownConsent: bool(process.env.CONSENT_ALLOW_UNKNOWN, true),
 // Keyword sets (case-insensitive, whole-message match after trimming/normalizing).
 stopKeywords: list(process.env.CONSENT_STOP_KEYWORDS, ['stop', 'unsubscribe', 'unsub', 'cancel', 'optout', 'opt out', 'opt-out', 'band', 'band karo', 'bnd kro', 'rok do', 'remove', 'mat bhejo']),
 startKeywords: list(process.env.CONSENT_START_KEYWORDS, ['start', 'subscribe', 'unstop', 'optin', 'opt in', 'opt-in', 'resume', 'shuru']),
 // Auto-reply text confirming an opt-out (the SENDER delivers it; this module only returns it).
 optOutConfirmation: process.env.CONSENT_OPTOUT_CONFIRMATION || 'You have been unsubscribed and will not receive further messages. Reply START to opt back in.',
 optInConfirmation: process.env.CONSENT_OPTIN_CONFIRMATION || 'You are subscribed again. Reply STOP anytime to unsubscribe.',
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.CONSENT_CENTER_STORE_PATH, 'data/consent-center.json'),
 },
};

module.exports = { config, bool, list, ROOT, DATA_DIR };
