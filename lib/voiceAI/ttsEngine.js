// lib/voiceAI/ttsEngine.js — Text-to-Speech engine. DRY-RUN by default.
// Contract: never calls a provider in dry-run; validates key presence (boolean) when live;
// blocks voice cloning unless consent + env flag; redacts all sensitive text.

const { config } = require('./config');
const providers = require('./providers');
const providerRegistry = require('./providerRegistry');
const consentGuard = require('./consentGuard');
const audioStore = require('./audioStore');
const { redactText, preview, maskId } = require('./redaction');
const auditLog = require('./auditLog');
const historyStore = require('./historyStore');

async function generate(input = {}) {
  const {
    text = '',
    language = config.defaultLanguage,
    voiceId = null,
    provider = config.defaultProvider,
    tone = 'professional',
    speed = 1.0,
    customerId = null,
    channel = 'whatsapp',
    purpose = 'reply',
    consentConfirmed = false,
    useVoiceClone = false,
    dryRun = config.dryRun,
  } = input;

  const warnings = [];
  const errors = [];

  const pInfo = providerRegistry.get(provider) || providerRegistry.defaultProvider();
  const effectiveDryRun = dryRun || !config.effective.liveTTS;

  // Voice clone hard-gate
  if (useVoiceClone) {
    const clone = consentGuard.canUseVoiceClone(customerId, consentConfirmed);
    if (!clone.allowed) {
      errors.push(`Voice cloning blocked: ${clone.reason}`);
    }
  }

  // External provider consent (only relevant when going live + external)
  if (!effectiveDryRun && pInfo.requiresApiKey) {
    const ext = consentGuard.canUseExternalProvider(customerId);
    if (!ext.allowed) {
      warnings.push(`External provider not permitted (${ext.reason}); forcing dry-run.`);
    }
  }

  const forceDry = effectiveDryRun || errors.length > 0;
  const synth = providers.getTTS(pInfo.id);
  let result;
  try {
    result = await synth({ text, language, voiceId, tone, speed });
  } catch (e) {
    errors.push(`Provider error: ${e.message}`);
    result = { ok: false, dryRun: true, provider: pInfo.id, estimatedDurationSec: 0 };
  }

  const planned = config.storeAudio && !forceDry ? audioStore.plannedPath('tts') : null;
  const auditId = auditLog.record('tts_preview_generated', {
    provider: pInfo.id, channel, purpose, customerId, dryRun: forceDry, language,
  }).id;

  historyStore.add({ type: 'tts', provider: pInfo.id, channel, status: forceDry ? 'dry_run' : 'generated', dryRun: forceDry, preview: text });

  return {
    ok: errors.length === 0,
    dryRun: forceDry,
    provider: pInfo.id,
    voiceIdMasked: maskId(voiceId || (result && result.meta && result.meta.voiceId) || 'default'),
    textPreview: preview(text),
    audioUrl: forceDry ? null : (result && result.audioUrl) || null,
    audioFilePath: planned ? planned.relativePath : null,
    estimatedDurationSec: (result && result.estimatedDurationSec) || 0,
    warnings,
    errors,
    consentRequired: pInfo.consentRequired || useVoiceClone,
    approvalRequired: config.requireApproval,
    auditId,
  };
}

// Preview = always dry-run, no side effects beyond audit.
async function previewOnly(input = {}) {
  return generate({ ...input, dryRun: true });
}

module.exports = { generate, previewOnly };
