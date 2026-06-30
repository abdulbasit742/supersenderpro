// realEstateAgent.js
// Property-aware conversational agent for the real-estate SaaS vertical.
// Follows the same module shape as salesAgent.js, but routes through the
// existing aiBrain (Ollama-first per workspace standing decision) and injects
// a lightweight RAG context built from the tenant's property catalog.
//
// Design goals:
//  - Additive: does not touch existing flows. Safe to import from routes/wati.js.
//  - Local-first: uses aiBrain.processPrompt, which prefers Ollama when
//    AI_PROVIDER=ollama (qwen2.5:32b). Cloud providers remain fallback only.
//  - Tenant-scoped: every lookup requires a tenantId; missing tenantId is an error.

const fs = require('fs');
const path = require('path');
const { processPrompt } = require('../aiBrain');

// ---- Catalog loading (cached, swappable for DB later) ----------------------
let _catalogCache = null;
let _catalogLoadedAt = 0;
const CATALOG_TTL_MS = 60 * 1000;

function loadCatalog() {
  const now = Date.now();
  if (_catalogCache && now - _catalogLoadedAt < CATALOG_TTL_MS) return _catalogCache;
  try {
    const p = path.join(__dirname, '..', '..', 'data', 'realestate-properties.sample.json');
    if (fs.existsSync(p)) {
      _catalogCache = JSON.parse(fs.readFileSync(p, 'utf8'));
      _catalogLoadedAt = now;
    } else {
      _catalogCache = { properties: [] };
    }
  } catch (err) {
    console.warn('[realEstateAgent] catalog load failed:', err.message);
    _catalogCache = { properties: [] };
  }
  return _catalogCache;
}

function propertiesForTenant(tenantId) {
  if (!tenantId) throw new Error('[realEstateAgent] tenantId is required (tenant isolation)');
  const cat = loadCatalog();
  return (cat.properties || []).filter(
    (p) => String(p.tenantId) === String(tenantId)
  );
}

// ---- Lightweight retrieval -------------------------------------------------
// Keyword/score retrieval over the catalog. Intentionally dependency-free so it
// runs anywhere; swap for vector search (local embeddings on PC #2) when ready.
function retrieveRelevant(message, props, topK = 4) {
  const q = (message || '').toLowerCase();
  const terms = q.split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  const scored = props.map((p) => {
    const hay = [
      p.title, p.city, p.area, p.type, p.bedrooms && p.bedrooms + ' bed',
      p.price && 'price ' + p.price, p.description
    ].filter(Boolean).join(' ').toLowerCase();
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const hits = scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.p);
  // Fall back to first few listings if nothing matched, so the agent still helps.
  return hits.length ? hits : props.slice(0, topK);
}

function formatContext(props) {
  if (!props.length) return 'No listings are currently available for this account.';
  return props
    .map((p, i) => {
      return `${i + 1}. ${p.title} | ${p.type} | ${p.bedrooms || '?'}BR | ${p.area || ''} ${p.city || ''} | ${p.price || 'price on request'} | ref:${p.id}\n   ${p.description || ''}`.trim();
    })
    .join('\n');
}

function buildPrompt({ message, contextBlock, lang }) {
  return [
    'You are a professional real-estate sales assistant working over WhatsApp.',
    'Answer ONLY using the listings provided below. If the customer asks for something not in the listings, say you will check with the team and offer the closest available option.',
    'Be concise (WhatsApp-friendly), warm, and always end with a clear next step (book a visit, share more photos, or connect to an agent).',
    lang && lang !== 'und' ? `Reply in the customer's language (detected: ${lang}).` : '',
    '',
    '=== AVAILABLE LISTINGS ===',
    contextBlock,
    '=== END LISTINGS ===',
    '',
    `Customer message: "${message}"`,
    '',
    'Your reply:'
  ].filter(Boolean).join('\n');
}

// Heuristic: should a human agent take over?
function shouldEscalate(message) {
  const m = (message || '').toLowerCase();
  return /(lawyer|legal|complaint|refund|angry|scam|fraud|manager)/.test(m);
}

/**
 * handleRealEstateConversation
 * @param {string} phone     customer phone (for logging / CRM linkage)
 * @param {string} message   inbound message text
 * @param {object} opts       { tenantId, languageCode }
 * @returns {Promise<{reply:string, shouldEscalate:boolean, matchedRefs:string[]}>}
 */
async function handleRealEstateConversation(phone, message, opts = {}) {
  const { tenantId, languageCode = 'und' } = opts;
  const props = propertiesForTenant(tenantId);
  const relevant = retrieveRelevant(message, props);
  const contextBlock = formatContext(relevant);
  const prompt = buildPrompt({ message, contextBlock, lang: languageCode });

  let reply;
  try {
    reply = await processPrompt(prompt, { languageCode });
  } catch (err) {
    console.error('[realEstateAgent] processPrompt failed:', err.message);
    reply = relevant.length
      ? `Thanks for your interest! Here are a few options I found:\n${formatContext(relevant)}\n\nWould you like to book a visit?`
      : 'Thanks for reaching out! Let me check available listings with our team and get right back to you.';
  }

  return {
    reply,
    shouldEscalate: shouldEscalate(message),
    matchedRefs: relevant.map((p) => p.id)
  };
}

module.exports = { handleRealEstateConversation, propertiesForTenant, retrieveRelevant };
