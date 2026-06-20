// lib/voiceAI/adapters/channelVoiceAdapter.js — WhatsApp Channel voiceover post draft.

const { preview } = require('./../redaction');

function buildChannelVoiceover({ channelName = '', script = '', language = 'roman_urdu' } = {}) {
  return {
    target: 'whatsapp_channel',
    channelName: channelName || null,
    scriptPreview: preview(script),
    language,
    dryRun: true,
    autoPost: false,
    manualPacket: { action: 'operator_posts_voiceover_to_channel_manually' },
  };
}

module.exports = { buildChannelVoiceover };
