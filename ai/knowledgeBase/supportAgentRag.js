// ai/knowledgeBase/supportAgentRag.js
// Bridge between the RAG store and the conversational support agent.
// Turns a customer query into a compact "retrieved context" block that can be
// injected into the support agent's prompt, upgrading it from a static FAQ list
// to real semantic retrieval over the knowledge base.

const rag = require('./ragStore');

/**
 * Build a context string for a query. Returns '' when nothing relevant is found,
 * so the caller can safely concatenate it into a prompt.
 */
async function getContext(storeId = 'default_store', query, { k = 4 } = {}) {
  let hits = [];
  try { hits = await rag.search(storeId, query, { k }); } catch { hits = []; }
  if (!hits.length) return { context: '', hits: [] };
  const context = hits
    .map((h, i) => `[${i + 1}] (${h.source}${h.title ? `: ${h.title}` : ''})\n${h.text}`)
    .join('\n\n');
  return {
    context: `RELEVANT KNOWLEDGE (retrieved for this question, use it to answer accurately):\n${context}`,
    hits
  };
}

module.exports = { getContext };
