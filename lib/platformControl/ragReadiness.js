// lib/platformControl/ragReadiness.js — RAG/vector modules, presence only, no live vector call.
  'use strict';
  const cfg = require('./config');
  const { maskPath } = require('./redactor');


  function ragReadiness() {
    return cfg.base({
        liveVectorCallEnabled: false,
        ragModulesPreview: cfg.findFiles([/rag/i, /retriev/i]).slice(0, 50).map(maskPath),
        vectorDbDetectedPreview: cfg.hasFile([/vector|chroma|pinecone|qdrant|faiss|weaviate/i]),
        embeddingModuleDetectedPreview: cfg.hasFile([/embed/i]),
         knowledgeBaseDetectedPreview: cfg.hasFile([/knowledge|\bkb[_.]/i]),
       });
  }


  module.exports = { ragReadiness };
