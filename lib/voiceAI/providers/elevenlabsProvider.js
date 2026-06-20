// lib/voiceAI/providers/elevenlabsProvider.js — ElevenLabs adapter.
// SAFETY: This module NEVER calls ElevenLabs unless live TTS is explicitly enabled AND a
// key is present. By default it returns a dry-run preview, exactly like the mock provider.
// No API key value is ever returned or logged — only a boolean about presence.

const { config, hasEnvKeys } = require('../config');
const mock = require('./mockProvider');

const ENV_KEYS = ['ELEVENLABS_API_KEY'];

function keyPresent() { return hasEnvKeys(ENV_KEYS); }

async function synthesize(args) {
  // Dry-run / disabled path → behave like mock, but tagged as elevenlabs.
  if (!config.effective.liveTTS) {
    const r = await mock.synthesize(args);
    return { ...r, provider: 'elevenlabs', dryRun: true, note: 'live_tts_disabled' };
  }
  if (!keyPresent()) {
    return {
      ok: false, dryRun: true, provider: 'elevenlabs',
      errors: ['ELEVENLABS_API_KEY missing — cannot run live. Returning safe dry-run.'],
      ...(await mock.synthesize(args)), note: 'missing_api_key',
    };
  }
  // NOTE: Real HTTP call intentionally NOT implemented here to keep the default build
  // fully offline and safe. To enable live generation, implement the fetch to
  // https://api.elevenlabs.io/v1/text-to-speech using process.env.ELEVENLABS_API_KEY,
  // gated by consent + approval upstream. Until then we fail safe.
  return {
    ok: false, dryRun: true, provider: 'elevenlabs',
    errors: ['Live ElevenLabs call not implemented in safe build. Enable explicitly.'],
    ...(await mock.synthesize(args)), note: 'live_not_implemented',
  };
}

module.exports = { synthesize, keyPresent, ENV_KEYS };
