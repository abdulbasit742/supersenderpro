// lib/voiceAI/optInGuard.js — Thin convenience wrapper over consentGuard for opt-in checks.

const consentGuard = require('./consentGuard');
const consentStore = require('./consentStore');

function isOptedIn(subjectId) {
  return consentStore.get(subjectId).voiceMessagesOptIn === true;
}

function assertCanSend(subjectId) {
  const r = consentGuard.canSendVoice(subjectId);
  return r;
}

module.exports = { isOptedIn, assertCanSend };
