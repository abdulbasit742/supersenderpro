// lib/voiceAI/providers/genericSttProvider.js — Generic STT adapter used for Google/Azure/
// AWS/Deepgram/whisper_local. Dry-run by default; never uploads audio unless live STT enabled.

const { config, hasEnvKeys } = require('../config');
const providerConfig = require('../providerConfig');
const mock = require('./mockProvider');

async function transcribe(args, providerId = 'whisper_local') {
  const meta = providerConfig[providerId] || {};
  if (!config.effective.liveSTT) {
    const r = await mock.transcribe(args);
    return { ...r, provider: providerId, dryRun: true, note: 'live_stt_disabled' };
  }
  if (meta.requiresApiKey && !hasEnvKeys(meta.envKeys)) {
    return { ok: false, dryRun: true, provider: providerId,
      errors: [`${(meta.envKeys || []).join(', ')} missing.`], ...(await mock.transcribe(args)), note: 'missing_api_key' };
  }
  return { ok: false, dryRun: true, provider: providerId,
    errors: ['Live STT not implemented in safe build.'], ...(await mock.transcribe(args)), note: 'live_not_implemented' };
}

module.exports = { transcribe };
