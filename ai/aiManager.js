const { generateWithGroq } = require('./providers/groq');
const { detectLanguage, getLanguageSpecificSystemPrompt } = require('./languageDetector');

module.exports = {
  generateAIResponse: async function(prompt, provider, apiKeys, model, context = {}) {
    // Detect language if not provided in context
    const langCode = context.language || detectLanguage(prompt);
    
    switch (provider) {
      case 'groq':
        return await generateWithGroq(prompt, apiKeys.groqApiKey, model || apiKeys.groqModel, langCode);
      case 'openai':
        throw new Error("OpenAI is configured as a placeholder but not yet activated.");
      case 'claude':
        throw new Error("Claude is configured as a placeholder but not yet activated.");
      case 'gemini':
        throw new Error("Gemini is configured as a placeholder but not yet activated.");
      default:
        throw new Error("Unknown AI provider selected.");
    }
  },
  
  // Specific AI Utilities for the SaaS Platform
  summarizeChat: async function(chatLog, provider, apiKeys) {
    const prompt = `Summarize the following customer chat log into a brief 3-sentence summary of the core issue and their intent:\n\n${chatLog}`;
    return await this.generateAIResponse(prompt, provider, apiKeys);
  },
  
  analyzeBuyerIntent: async function(chatLog, provider, apiKeys) {
    const prompt = `Analyze the behavior of the customer in this chat log. Reply with exactly one word from the following: HOT, WARM, COLD. Chat log:\n\n${chatLog}`;
    return await this.generateAIResponse(prompt, provider, apiKeys);
  }
};
