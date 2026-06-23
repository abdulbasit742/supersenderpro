// lib/platformControl/aiProviderReadiness.js — read-only AI provider readiness. No live AI calls.
'use strict';
const cfg = require('./config');

function getAiProviderReadiness() {
  const providers = [
    { name: 'openai', key: 'OPENAI_API_KEY' },
    { name: 'anthropic', key: 'ANTHROPIC_API_KEY' },
    { name: 'gemini', key: 'GEMINI_API_KEY' },
    { name: 'openrouter', key: 'OPENROUTER_API_KEY' },
    { name: 'groq', key: 'GROQ_API_KEY' },
    { name: 'ollama', key: 'OLLAMA_HOST' },
    { name: 'tavily', key: 'TAVILY_API_KEY' },
  ];
  const providersPreview = providers.map((p) => ({ name: p.name, configured: !!process.env[p.key], source: 'env_preview' }));
  const configuredProvidersMaskedPreview = providersPreview.filter((p) => p.configured).map((p) => p.name + '=configured');
  const modulesReadyPreview = cfg.anyExists(cfg.HINTS.ai);
  return cfg.safetyFlags({
    liveAiCallEnabled: false,
    providersPreview,
    configuredProvidersMaskedPreview,
    modulesReadyPreview,
    ragReadyPreview: cfg.anyExists(cfg.HINTS.rag),
    vectorDbReadyPreview: false,
    warnings: configuredProvidersMaskedPreview.length ? [] : ['no_ai_provider_configured_preview'],
    blockers: [],
  });
}
module.exports = { getAiProviderReadiness };
