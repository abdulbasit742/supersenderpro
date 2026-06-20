// lib/voiceAI/productVoiceover.js — Generates short voiceover SCRIPTS for product posts/reels.
// Returns text scripts only (dry-run). Actual audio requires the TTS engine + approval.

const { preview } = require('./redaction');

function script({ product = 'Product', price = null, highlight = '', language = 'roman_urdu' } = {}) {
  const lines = {
    roman_urdu: `${product} — ${highlight || 'best quality'}! ${price ? 'Sirf Rs ' + price + '. ' : ''}Abhi order karein.`,
    english: `${product} — ${highlight || 'top quality'}! ${price ? 'Only Rs ' + price + '. ' : ''}Order now.`,
    urdu: `${product} — ${highlight || 'بہترین کوالٹی'}! ${price ? 'صرف Rs ' + price + '۔ ' : ''}ابھی آرڈر کریں۔`,
  };
  const text = lines[language] || lines.roman_urdu;
  return { type: 'product_voiceover_script', language, text, preview: preview(text), dryRun: true };
}

module.exports = { script };
