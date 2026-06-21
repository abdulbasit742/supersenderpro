// lib/platformControl/aiProviderReadiness.js — AI providers, key + module presence, live calls OFF.
  'use strict';
  const cfg = require('./config');


  const PROVIDERS = [
       { name: 'openai', key: 'OPENAI_API_KEY', file: /openai/i },
       { name: 'anthropic', key: 'ANTHROPIC_API_KEY', file: /anthropic|claude/i },
       { name: 'gemini', key: 'GEMINI_API_KEY', file: /gemini|google.*ai/i },
       { name: 'openrouter', key: 'OPENROUTER_API_KEY', file: /openrouter/i },
       { name: 'groq', key: 'GROQ_API_KEY', file: /groq/i },
       { name: 'ollama', key: 'OLLAMA_BASE_URL', file: /ollama/i },
  ];


  function aiProviderReadiness() {
    const keys = cfg.envKeyNames();
       const providersPreview = PROVIDERS.map((p) => ({
         name: p.name, keyPresentPreview: keys.includes(p.key), moduleDetectedPreview: cfg.hasFile([p.file]),
       }));
       return cfg.base({
        liveAiCallEnabled: false,
        providersPreview,
        configuredProvidersMaskedPreview: providersPreview
          .filter((p) => p.keyPresentPreview || p.moduleDetectedPreview)
          .map((p) => ({ name: p.name, status: 'configured' })),
        ragReadyPreview: cfg.hasFile([/rag/i, /retriev/i]),
         vectorDbReadyPreview: cfg.hasFile([/vector|embed|chroma|pinecone|qdrant|faiss|weaviate/i]),
       });
  }


  module.exports = { aiProviderReadiness, PROVIDERS };
