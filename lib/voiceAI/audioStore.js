// lib/voiceAI/audioStore.js — Manages the (optional) audio output directory.
// By default audio is NOT stored. When enabled, only generated (non-PII) audio is kept.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function ensureDir() {
  if (!config.storeAudio) return null;
  try {
    if (!fs.existsSync(config.paths.audioStore)) fs.mkdirSync(config.paths.audioStore, { recursive: true });
    return config.paths.audioStore;
  } catch (_e) { return null; }
}

// Returns a planned (repo-relative) path for an audio artifact WITHOUT writing anything in dry-run.
function plannedPath(prefix = 'tts') {
  const name = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
  const rel = path.join('data', 'voice-ai-audio', name);
  return { name, relativePath: rel.split(path.sep).join('/') };
}

module.exports = { ensureDir, plannedPath };
