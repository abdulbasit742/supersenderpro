// aiBrain.js – Advanced cognitive routing, agent decision engine, and multilingual model processing.
const fs = require('fs');
const path = require('path');

// Lazy load providers
const providers = {
  groq: () => require('./providers/groq'),
  openai: () => require('./providers/openai'),
  anthropic: () => require('./providers/anthropic'),
  gemini: () => require('./providers/gemini'),
  deepseek: () => require('./providers/deepseek'),
  openrouter: () => require('./providers/openrouter'),
  ollama: () => require('./providers/ollama')
};

function loadSettings() {
  try {
    const settingsPath = path.join(__dirname, '..', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (err) {
    console.warn('[aiBrain] Failed to load settings.json:', err.message);
  }
  return {};
}

async function processPrompt(prompt, options = {}) {
  const settings = loadSettings();
  
  // Resolve provider
  const provider = (settings.ai_provider || process.env.AI_PROVIDER || 'groq').toLowerCase();
  
  // Resolve model based on provider
  let defaultModel = 'llama-3.3-70b-versatile';
  if (provider === 'openai') defaultModel = 'gpt-4o-mini';
  else if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-latest';
  else if (provider === 'gemini') defaultModel = 'gemini-1.5-flash';
  else if (provider === 'deepseek') defaultModel = 'deepseek-chat';
  else if (provider === 'openrouter') defaultModel = 'meta-llama/llama-3.3-70b-instruct';
  else if (provider === 'ollama') defaultModel = 'llama3';

  const model = settings.ai_model || process.env.AI_MODEL || options.model || defaultModel;
  const languageCode = options.languageCode || 'und';

  console.log(`[aiBrain] Routing prompt to provider: ${provider}, model: ${model}, lang: ${languageCode}`);

  try {
    if (providers[provider]) {
      let key = null;
      let hostUrl = null;

      if (provider === 'ollama') {
        hostUrl = settings.ollama_host || process.env.OLLAMA_HOST || 'http://localhost:11434';
      } else {
        const keyMap = {
          groq: settings.groq_api_key || process.env.GROQ_API_KEY,
          openai: settings.openai_api_key || process.env.OPENAI_API_KEY,
          anthropic: settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY,
          gemini: settings.gemini_api_key || process.env.GEMINI_API_KEY,
          deepseek: settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY,
          openrouter: settings.openrouter_api_key || process.env.OPENROUTER_API_KEY
        };
        key = keyMap[provider];
      }

      if (key || provider === 'ollama') {
        const connector = providers[provider]();
        const response = await connector.generate(prompt, key || hostUrl, model, languageCode);
        return response;
      }
    }
  } catch (err) {
    console.error(`[aiBrain] Provider '${provider}' execution failed. Falling back to heuristics...`, err.message);
  }

  // Smart Heuristic Fallback Engine
  const normalized = prompt.toLowerCase();
  
  if (normalized.includes('order') || normalized.includes('buy') || normalized.includes('price')) {
    return "🛍️ [AI Sales Assistant] I can help you browse tools, select products, and complete checkout. Please let me know what tools you are interested in!";
  }
  
  if (normalized.includes('stock') || normalized.includes('inventory') || normalized.includes('credentials')) {
    return "📦 [AI Stock Manager] Checking real-time stock levels. Let me query our secure mutex store for availability.";
  }
  
  if (normalized.includes('campaign') || normalized.includes('broadcast') || normalized.includes('whatsapp')) {
    return "📈 [AI Campaign Builder] Automation triggers are ready. I can queue WhatsApp messages to your audience segments.";
  }

  return `🤖 [AI Assist] Received prompt: "${prompt}". Connect your ${provider.toUpperCase()}_API_KEY in the environment settings to enable live LLM model generation.`;
}

module.exports = { processPrompt };
