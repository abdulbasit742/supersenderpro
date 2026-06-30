'use strict';
// #86 Multi-Language & Localization — config.
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }
module.exports = {
  enabled: bool(process.env.LOCALIZATION_ENABLED, true),
  defaultLocale: process.env.LOCALE_DEFAULT || 'en',
  // Supported locales (ISO 639-1). Detection results outside this set fall back to default.
  supported: (process.env.LOCALE_SUPPORTED || 'en,ur,hi,ar,es,fr,de').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  // Use llmHub to translate when no stored translation exists.
  translateViaLLM: bool(process.env.LOCALE_TRANSLATE_VIA_LLM, true),
  // Minimum characters before language detection is trusted.
  minDetectChars: Number(process.env.LOCALE_MIN_DETECT_CHARS) || 12
};
