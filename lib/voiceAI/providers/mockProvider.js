// lib/voiceAI/providers/mockProvider.js — The default, fully offline provider.
// Produces deterministic dry-run previews. NEVER touches the network or filesystem audio.

const { redactText } = require('../redaction');

function estimateDurationSec(text) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  // ~150 wpm speaking rate
  return Math.max(1, Math.round((words / 150) * 60));
}

async function synthesize({ text, language, voiceId, tone }) {
  return {
    ok: true,
    dryRun: true,
    provider: 'mock_dry_run',
    audioUrl: null,
    audioFilePath: null,
    estimatedDurationSec: estimateDurationSec(text),
    textPreview: redactText(text).slice(0, 160),
    meta: { language, tone, voiceId: voiceId || 'mock-voice', simulated: true },
  };
}

async function transcribe({ languageHint }) {
  return {
    ok: true,
    dryRun: true,
    provider: 'mock_dry_run',
    transcript: '[dry-run transcript — no audio was sent to any provider]',
    language: languageHint || 'roman_urdu',
    confidence: 0.0,
    durationSec: 0,
    simulated: true,
  };
}

module.exports = { synthesize, transcribe, estimateDurationSec };
