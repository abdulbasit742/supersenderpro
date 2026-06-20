// lib/voiceAI/config.js — Central, safe configuration for the Voice AI Command Center.
// Everything is DRY-RUN and approval-protected by default. No external provider is ever
// called unless the matching env flag is explicitly set to "true". This module never prints
// or returns secret values — only booleans about whether a key is present.

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).trim().toLowerCase() === 'true';
}

function resolveDataPath(envVal, fallbackRel) {
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  // Force repo-relative paths only. Reject absolute / drive paths.
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) {
    return path.join(ROOT, fallbackRel);
  }
  return path.join(ROOT, val);
}

const config = {
  enabled: bool(process.env.VOICE_AI_ENABLED, true),
  dryRun: bool(process.env.VOICE_AI_DRY_RUN, true),
  requireApproval: bool(process.env.VOICE_AI_REQUIRE_APPROVAL, true),

  allowLiveTTS: bool(process.env.VOICE_AI_ALLOW_LIVE_TTS, false),
  allowLiveSTT: bool(process.env.VOICE_AI_ALLOW_LIVE_STT, false),
  allowVoiceCloning: bool(process.env.VOICE_AI_ALLOW_VOICE_CLONING, false),
  allowLiveSend: bool(process.env.VOICE_AI_ALLOW_LIVE_SEND, false),

  storeAudio: bool(process.env.VOICE_AI_STORE_AUDIO, false),
  storeTranscripts: bool(process.env.VOICE_AI_STORE_TRANSCRIPTS, false),
  storeText: bool(process.env.VOICE_AI_STORE_TEXT, false),

  defaultProvider: process.env.VOICE_AI_DEFAULT_PROVIDER || 'mock_dry_run',
  defaultLanguage: process.env.VOICE_AI_DEFAULT_LANGUAGE || 'roman_urdu',

  maxQueue: Number(process.env.VOICE_AI_MAX_QUEUE || 500),
  cleanupDays: Number(process.env.VOICE_AI_CLEANUP_DAYS || 7),

  paths: {
    dataDir: DATA_DIR,
    audioStore: resolveDataPath(process.env.VOICE_AI_AUDIO_STORE_PATH, 'data/voice-ai-audio'),
    store: resolveDataPath(process.env.VOICE_AI_STORE_PATH, 'data/voice-ai.json'),
    queue: resolveDataPath(process.env.VOICE_AI_QUEUE_PATH, 'data/voice-ai-queue.json'),
    history: resolveDataPath(process.env.VOICE_AI_HISTORY_PATH, 'data/voice-ai-history.json'),
    audit: resolveDataPath(process.env.VOICE_AI_AUDIT_PATH, 'data/voice-ai-audit.json'),
    consent: resolveDataPath(process.env.VOICE_AI_CONSENT_PATH, 'data/voice-ai-consent.json'),
    conversations: resolveDataPath(process.env.VOICE_AI_CONVO_PATH, 'data/voice-ai-conversations.json'),
    transcripts: resolveDataPath(process.env.VOICE_AI_TRANSCRIPT_PATH, 'data/voice-ai-transcripts.json'),
  },
};

// Effective flags: even if a "live" flag is on, the global dryRun master switch wins
// unless live is explicitly allowed. This guarantees no accidental live action.
config.effective = {
  liveTTS: config.enabled && config.allowLiveTTS && !config.dryRun,
  liveSTT: config.enabled && config.allowLiveSTT && !config.dryRun,
  liveSend: config.enabled && config.allowLiveSend && !config.dryRun,
  voiceCloning: config.enabled && config.allowVoiceCloning,
};

function hasEnvKeys(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return true;
  return keys.every((k) => !!(process.env[k] && String(process.env[k]).trim()));
}

module.exports = { config, bool, hasEnvKeys, ROOT, DATA_DIR };
