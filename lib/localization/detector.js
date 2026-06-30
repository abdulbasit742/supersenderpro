'use strict';
// #86 Multi-Language & Localization — language detection via franc (already a dep), graceful fallback.
const config = require('./config');

// franc returns ISO 639-3; map the common ones to 639-1.
const MAP_3_TO_1 = { eng: 'en', urd: 'ur', hin: 'hi', arb: 'ar', ara: 'ar', spa: 'es', fra: 'fr', deu: 'de', por: 'pt', rus: 'ru', zho: 'zh', cmn: 'zh' };

function detect(text) {
  if (!text || String(text).trim().length < config.minDetectChars) return { locale: config.defaultLocale, confident: false };
  let code3 = 'und';
  try {
    const francMod = require('franc');
    const franc = francMod.franc || francMod; // support both ESM/CJS shapes
    code3 = franc(String(text)) || 'und';
  } catch (_) {
    return { locale: config.defaultLocale, confident: false, note: 'franc unavailable' };
  }
  const code1 = MAP_3_TO_1[code3] || null;
  if (code1 && config.supported.includes(code1)) return { locale: code1, confident: true };
  return { locale: config.defaultLocale, confident: false, raw: code3 };
}
module.exports = { detect, MAP_3_TO_1 };
