// lib/voiceAI/audioMetadata.js — Normalizes inbound audio metadata WITHOUT reading the
// audio bytes. We only keep safe metadata (mime type, duration, source) — never raw audio.

function normalize(input = {}) {
  return {
    sourceType: input.sourceType || 'unknown',     // whatsapp | telegram | upload | browser | social
    audioMimeType: input.audioMimeType || null,
    durationSec: Number(input.durationSec || 0) || null,
    sizeBytes: Number(input.sizeBytes || 0) || null,
    hasAudioRef: !!input.audioSource,               // boolean only — never store the ref content
    messageId: input.messageId || null,
    receivedAt: new Date().toISOString(),
  };
}

module.exports = { normalize };
