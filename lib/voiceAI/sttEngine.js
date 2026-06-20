// lib/voiceAI/sttEngine.js — Speech-to-Text engine. DRY-RUN by default.
// Never uploads audio externally unless live STT enabled. Never stores full audio.
// Always returns a safe, redacted preview + intent + sentiment.

const { config } = require('./config');
const providers = require('./providers');
const providerRegistry = require('./providerRegistry');
const audioMetadata = require('./audioMetadata');
const intentClassifier = require('./voiceIntentClassifier');
const sentiment = require('./voiceSentiment');
const transcriptStore = require('./transcriptStore');
const { preview, redactText } = require('./redaction');
const auditLog = require('./auditLog');
const historyStore = require('./historyStore');

async function transcribe(input = {}) {
  const {
    sourceType = 'upload',
    customerId = null,
    languageHint = config.defaultLanguage,
    provider = config.defaultProvider,
    consentConfirmed = false,
    dryRun = config.dryRun,
  } = input;

  const warnings = [];
  const errors = [];
  const meta = audioMetadata.normalize(input);
  const pInfo = providerRegistry.get(provider) || providerRegistry.defaultProvider();
  const effectiveDryRun = dryRun || !config.effective.liveSTT;

  if (!effectiveDryRun && pInfo.requiresApiKey && !consentConfirmed) {
    warnings.push('External STT requires consent; forcing dry-run.');
  }
  const forceDry = effectiveDryRun || (pInfo.requiresApiKey && !consentConfirmed);

  const stt = providers.getSTT(pInfo.id);
  let result;
  try {
    result = await stt({ ...input, languageHint });
  } catch (e) {
    errors.push(`Provider error: ${e.message}`);
    result = { ok: false, transcript: '', language: languageHint, confidence: 0 };
  }

  const transcript = result.transcript || '';
  const intent = intentClassifier.classify(transcript);
  const sent = sentiment.analyze(transcript);

  // Store only if allowed
  const stored = transcriptStore.save(customerId, transcript, { language: result.language, intent: intent.intent });

  const auditId = auditLog.record('stt_preview_generated', {
    provider: pInfo.id, sourceType, customerId, dryRun: forceDry, stored: stored.stored,
  }).id;
  historyStore.add({ type: 'stt', provider: pInfo.id, channel: sourceType, status: forceDry ? 'dry_run' : 'transcribed', dryRun: forceDry, preview: transcript, intent: intent.intent, sentiment: sent.sentiment });

  return {
    ok: errors.length === 0,
    dryRun: forceDry,
    provider: pInfo.id,
    transcript: config.storeText ? redactText(transcript) : undefined,
    transcriptPreview: preview(transcript),
    language: result.language || languageHint,
    confidence: result.confidence || 0,
    durationSec: meta.durationSec || result.durationSec || 0,
    detectedIntent: intent.intent,
    intentConfidence: intent.confidence,
    sentiment: sent.sentiment,
    transcriptStored: stored.stored,
    warnings,
    errors,
    auditId,
  };
}

async function previewOnly(input = {}) { return transcribe({ ...input, dryRun: true }); }

module.exports = { transcribe, previewOnly };
