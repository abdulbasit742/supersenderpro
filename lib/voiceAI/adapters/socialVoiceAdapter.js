// lib/voiceAI/adapters/socialVoiceAdapter.js — Voiceover drafts for social platforms.
// Returns drafts + manual packets. Never posts live.

const { preview } = require('./../redaction');

function buildVoiceoverDraft({ platform = 'facebook', script = '', language = 'roman_urdu', durationSec = null } = {}) {
  const valid = ['facebook', 'instagram', 'linkedin', 'tiktok', 'reels'];
  return {
    platform: valid.includes(platform) ? platform : 'facebook',
    scriptPreview: preview(script),
    language,
    estimatedDurationSec: durationSec,
    dryRun: true,
    autoPost: false,
    manualPacket: { action: 'operator_records_or_uploads_voiceover_then_posts_manually' },
  };
}

module.exports = { buildVoiceoverDraft };
