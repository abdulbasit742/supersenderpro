// lib/consentCenter/index.js — Consent & Opt-Out Compliance (barrel export).
//
// Detects inbound opt-out/opt-in keywords (STOP/UNSUBSCRIBE/band karo + START/resume), maintains
// per-contact consent + a suppression list, exposes a pre-send gate canSend() that EVERY send must
// pass, and keeps an auditable consent-change log. Syncs consent to lib/contacts (#12) when present
// so segments + sends everywhere honor the same source of truth.
//
// SAFETY: this is a compliance guardrail. It never sends. Default posture is opt-out model (unknown
// allowed) but opt-out ALWAYS wins; flip CONSENT_ALLOW_UNKNOWN=false for a strict opt-in model.
// Contacts are masked in logs/views.

const { config } = require('./config');
const consentEngine = require('./consentEngine');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 keywords: require('./keywords'),
 consentEngine,
 doctor: require('./doctor'),
 // convenience top-level helpers
 canSend: consentEngine.canSend,
 processInbound: consentEngine.processInbound,
 filterSendable: consentEngine.filterSendable,
};
