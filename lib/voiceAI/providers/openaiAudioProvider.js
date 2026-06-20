// lib/voiceAI/providers/openaiAudioProvider.js — OpenAI audio (TTS + Whisper STT) adapter.
// Same safety contract as the ElevenLabs adapter: dry-run unless live is enabled + key present.

const { config, hasEnvKeys } = require('../config');
const mock = require('./mockProvider');

const ENV_KEYS = ['OPENAI_AUDIO_API_KEY'];
function keyPresent() { return hasEnvKeys(ENV_KEYS); }

async function synthesize(args) {
  if (!config.effective.liveTTS) {
    const r = await mock.synthesize(args);
    return { ...r, provider: 'openai_audio', dryRun: true, note: 'live_tts_disabled' };
  }
  if (!keyPresent()) {
    return { ok: false, dryRun: true, provider: 'openai_audio',
      errors: ['OPENAI_AUDIO_API_KEY missing.'], ...(await mock.synthesize(args)), note: 'missing_api_key' };
  }
  return { ok: false, dryRun: true, provider: 'openai_audio',
    errors: ['Live OpenAI TTS not implemented in safe build.'], ...(await mock.synthesize(args)), note: 'live_not_implemented' };
}

async function transcribe(args) {
  if (!config.effective.liveSTT) {
    const r = await mock.transcribe(args);
    return { ...r, provider: 'openai_audio', dryRun: true, note: 'live_stt_disabled' };
  }
  if (!keyPresent()) {
    return { ok: false, dryRun: true, provider: 'openai_audio',
      errors: ['OPENAI_AUDIO_API_KEY missing.'], ...(await mock.transcribe(args)), note: 'missing_api_key' };
  }
  return { ok: false, dryRun: true, provider: 'openai_audio',
    errors: ['Live OpenAI STT not implemented in safe build.'], ...(await mock.transcribe(args)), note: 'live_not_implemented' };
}

module.exports = { synthesize, transcribe, keyPresent, ENV_KEYS };
