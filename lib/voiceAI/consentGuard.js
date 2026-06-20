// lib/voiceAI/consentGuard.js — Central decision layer for "is this voice action allowed?".
// Combines global config flags with per-subject consent. Fails safe (deny) by default.

const { config } = require('./config');
const consentStore = require('./consentStore');
const auditLog = require('./auditLog');

// Can we generate / send a voice reply to this subject?
function canSendVoice(subjectId) {
  const c = consentStore.get(subjectId);
  if (!c.voiceMessagesOptIn) {
    return { allowed: false, reason: 'subject_not_opted_in', approvalRequired: true };
  }
  return { allowed: true, reason: 'opted_in', approvalRequired: config.requireApproval };
}

// Can we send audio to an EXTERNAL provider (ElevenLabs/OpenAI/etc.)?
function canUseExternalProvider(subjectId) {
  if (!config.effective.liveTTS && !config.effective.liveSTT) {
    return { allowed: false, reason: 'live_provider_disabled' };
  }
  const c = consentStore.get(subjectId);
  if (!c.externalProviderOptIn) {
    return { allowed: false, reason: 'external_provider_consent_missing' };
  }
  return { allowed: true, reason: 'external_provider_allowed' };
}

// Can we store the transcript text?
function canStoreTranscript(subjectId) {
  if (!config.storeTranscripts) return { allowed: false, reason: 'transcript_storage_disabled' };
  const c = consentStore.get(subjectId);
  return { allowed: !!c.transcriptionOptIn, reason: c.transcriptionOptIn ? 'ok' : 'transcription_consent_missing' };
}

// Can we use a custom / cloned voice profile? Hard-gated.
function canUseVoiceClone(subjectId, consentConfirmed = false) {
  if (!config.effective.voiceCloning) {
    auditLog.record('voice_clone_blocked', { subjectId, reason: 'cloning_disabled_globally' });
    return { allowed: false, reason: 'voice_cloning_disabled' };
  }
  const c = consentStore.get(subjectId);
  if (!consentConfirmed || !c.voiceCloneOptIn) {
    auditLog.record('voice_clone_blocked', { subjectId, reason: 'no_explicit_consent' });
    return { allowed: false, reason: 'voice_clone_consent_required' };
  }
  return { allowed: true, reason: 'voice_clone_allowed_with_consent' };
}

module.exports = { canSendVoice, canUseExternalProvider, canStoreTranscript, canUseVoiceClone };
