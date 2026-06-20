// lib/voiceAI/adapters/telegramVoiceAdapter.js — Telegram voice draft builder (dry-run only).

const { preview } = require('./../redaction');

function buildVoiceDraft({ chatIdMasked = null, text = '', language = 'roman_urdu' } = {}) {
  return { platform: 'telegram', to: chatIdMasked, textPreview: preview(text), language, dryRun: true, autoSend: false };
}

module.exports = { buildVoiceDraft };
