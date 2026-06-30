// lib/aiAutoReply/intent.js — Lightweight intent + FAQ matching with a confidence score.
// Deterministic keyword scoring; no external calls. Confidence in [0,1] reflects how strongly
// the message matched a known FAQ. Used to decide answer-vs-handoff.

const HANDOFF_INTENTS = ['complaint', 'human', 'agent', 'speak to someone', 'manager', 'angry', 'legal'];

function _tokens(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean); }

function wantsHuman(text) {
 const s = String(text || '').toLowerCase();
 return HANDOFF_INTENTS.some((k) => s.includes(k));
}

// Score each FAQ by keyword overlap; return the best with a normalized confidence.
function match(text, faqs = []) {
 const toks = new Set(_tokens(text));
 let best = null;
 for (const f of faqs) {
 const kws = (f.keywords || []).map((k) => String(k).toLowerCase());
 let hits = 0;
 for (const k of kws) { if (k.includes(' ') ? String(text || '').toLowerCase().includes(k) : toks.has(k)) hits += 1; }
 const score = kws.length ? hits / kws.length : 0;
 if (!best || score > best.score) best = { faq: f, score, hits };
 }
 if (!best || best.hits === 0) return { faq: null, confidence: 0 };
 // Confidence: scaled by hits, capped at 0.95. A single strong hit already gives decent signal.
 const confidence = Math.min(0.95, 0.5 + 0.15 * best.hits + 0.3 * best.score);
 return { faq: best.faq, confidence: Math.round(confidence * 100) / 100 };
}

module.exports = { match, wantsHuman, HANDOFF_INTENTS };
