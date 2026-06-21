// lib/platformControl/ragReadiness.js — read-only RAG / vector DB readiness. No connectivity.
'use strict';
const cfg = require('./config');

function getRagReadiness() {
  const knowledgeModulesPreview = cfg.anyExists(cfg.HINTS.rag);
  const vectorEnv = ['PINECONE_API_KEY', 'QDRANT_URL', 'WEAVIATE_URL', 'CHROMA_URL'];
  const vectorConfiguredPreview = vectorEnv.filter((k) => !!process.env[k]).map((k) => k + '=configured');
  return cfg.safetyFlags({
    liveVectorQueryEnabled: false,
    knowledgeModulesPreview,
    vectorDbConfiguredPreview: vectorConfiguredPreview,
    vectorDbReadyPreview: vectorConfiguredPreview.length > 0,
    embeddingProviderReadyPreview: !!process.env.OPENAI_API_KEY,
    warnings: vectorConfiguredPreview.length ? [] : ['no_vector_db_configured_preview'],
    blockers: [],
  });
}
module.exports = { getRagReadiness };
