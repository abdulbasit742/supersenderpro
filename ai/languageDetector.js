// Language Detection Utility for AI responses
const francModule = require('franc');
const franc = typeof francModule === 'function' ? francModule : francModule.franc;
let langs = [];
try {
  ({ langs } = require('franc-min'));
} catch {
  langs = [
    ['eng', 'English'],
    ['urd', 'Urdu'],
    ['hin', 'Hindi'],
    ['ara', 'Arabic'],
    ['spa', 'Spanish'],
    ['fra', 'French']
  ];
}

/**
 * Detect language of text using franc-all
 * @param {string} text - Text to analyze
 * @returns {string} - ISO 639-3 language code or 'und' for undetermined
 */
function detectLanguage(text) {
  // Clean text for better detection
  const cleanedText = text.replace(/[^\w\s]/g, ' ').trim();
  
  if (!cleanedText || cleanedText.length < 3) {
    return 'und'; // Undetermined for very short text
  }
  
  try {
    const langCode = franc(cleanedText, { minLength: 3 });
    // Return 'und' if franc couldn't determine
    return langCode === 'und' ? 'und' : langCode;
  } catch (error) {
    console.warn('Language detection error:', error);
    return 'und';
  }
}

/**
 * Get language name from ISO 639-3 code
 * @param {string} langCode - ISO 639-3 language code
 * @returns {string} - Language name or 'Unknown'
 */
function getLanguageName(langCode) {
  const language = langs.find(l => l[0] === langCode);
  return language ? language[1] : 'Unknown';
}

/**
 * Check if language is supported for AI responses
 * @param {string} langCode - ISO 639-3 language code
 * @returns {boolean} - True if supported
 */
function isLanguageSupported(langCode) {
  // Currently supporting major languages, can be expanded
  const supportedLanguages = [
    'eng', // English
    'urd', // Urdu
    'hin', // Hindi
    'ara', // Arabic
    'spa', // Spanish
    'fra', // French
    'zul', // Zulu
    'xho', // Xhosa
    'sot', // Southern Sotho
    'tsn', // Tswana
    'ssw', // Swati
    'ven', // Venda
    'nbl'  // Northern Ndebele
  ];
  
  return supportedLanguages.includes(langCode) || langCode === 'und';
}

/**
 * Get appropriate system prompt based on detected language
 * @param {string} langCode - ISO 639-3 language code
 * @param {Object} settings - Business settings
 * @returns {string} - System prompt for AI
 */
function getLanguageSpecificSystemPrompt(langCode, settings) {
  const businessName = settings.business_name || 'SuperSender Store';
  const storePhone = settings.owner_whatsapp || 'N/A';
  
  // Base system prompt in English
  let basePrompt = `You are the expert sales AI for "${businessName}".
  
  The current live inventory is injected by the server below this system prompt.
  
  Store Phone: ${storePhone}
  
  Rules:
  1. ONLY recommend laptops explicitly listed in the inventory above. If they ask for something else, say it is out of stock.
  2. Be highly accurate about prices.
  3. Respond in the same language as the customer's message.
  4. Keep responses friendly, conversational, and under 80 words.`;
  
  // Language-specific instructions
  switch (langCode) {
    case 'urd': // Urdu
      basePrompt += '\n\nRespond in Roman Urdu (Urdu written in English letters) mixed with English as needed.';
      break;
    case 'hin': // Hindi
      basePrompt += '\n\nRespond in Hindi mixed with English as needed.';
      break;
    case 'ara': // Arabic
      basePrompt += '\n\nRespond in Arabic mixed with English as needed.';
      break;
    case 'spa': // Spanish
      basePrompt += '\n\nRespond in Spanish mixed with English as needed.';
      break;
    case 'fra': // French
      basePrompt += '\n\nRespond in French mixed with English as needed.';
      break;
    default:
      // For other languages including English, use standard prompt
      basePrompt += '\n\nRespond in a friendly conversational mix appropriate for the language detected.';
  }
  
  return basePrompt;
}

module.exports = {
  detectLanguage,
  getLanguageName,
  isLanguageSupported,
  getLanguageSpecificSystemPrompt
};
