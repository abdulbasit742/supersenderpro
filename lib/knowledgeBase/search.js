// lib/knowledgeBase/search.js — Dependency-free ranked search over published articles. Scores each
// article by query-term overlap with TF weighting + field boosts (title/tags weighted higher than
// body) and an inverse-document-frequency-ish rarity bonus so distinctive terms matter more. No
// external search engine; good enough to ground the AI auto-reply (#14) + power a help widget.

const store = require('./store');
const { config } = require('./config');
const { tokens, termFreq } = require('./tokenize');

const TITLE_BOOST = 3.0;
const TAG_BOOST = 2.5;
const BODY_BOOST = 1.0;

function _publishedArticles(d) { return d.articles.filter((a) => a.status === 'published'); }

// Precompute document frequency for rarity weighting.
function _docFreq(articles) {
 const df = {};
 for (const a of articles) {
 const seen = new Set(tokens(`${a.title} ${a.body} ${(a.tags || []).join(' ')}`));
 for (const t of seen) df[t] = (df[t] || 0) + 1;
 }
 return df;
}

function search(query, { limit = config.searchLimit, includeUnpublished = false } = {}) {
 const d = store.load();
 const articles = includeUnpublished ? d.articles.filter((a) => a.status !== 'archived') : _publishedArticles(d);
 const qTokens = tokens(query);
 if (!qTokens.length || !articles.length) return [];
 const N = articles.length;
 const df = _docFreq(articles);
 const qSet = new Set(qTokens);

 const scored = articles.map((a) => {
 const titleTf = termFreq(a.title);
 const tagTf = termFreq((a.tags || []).join(' '));
 const bodyTf = termFreq(a.body);
 let score = 0; let matched = 0;
 for (const t of qSet) {
 const idf = Math.log(1 + N / (1 + (df[t] || 0))); // rarer term -> higher idf
 const contrib = ((titleTf[t] || 0) * TITLE_BOOST + (tagTf[t] || 0) * TAG_BOOST + (bodyTf[t] || 0) * BODY_BOOST) * idf;
 if (contrib > 0) matched += 1;
 score += contrib;
 }
 // Normalize lightly by query size + reward matching more distinct query terms.
 const coverage = matched / qSet.size;
 const norm = (score / (qSet.size + 1)) * (0.5 + 0.5 * coverage);
 return { article: a, score: Math.round(norm * 1000) / 1000, coverage: Math.round(coverage * 100) / 100, matchedTerms: matched };
 });

 return scored
 .filter((s) => s.score >= config.minScore && s.matchedTerms > 0)
 .sort((a, b) => b.score - a.score)
 .slice(0, limit)
 .map((s) => ({ id: s.article.id, title: s.article.title, snippet: _snippet(s.article.body, qSet), category: s.article.category, tags: s.article.tags || [], score: s.score, coverage: s.coverage }));
}

// Build a short snippet around the first query-term hit.
function _snippet(body, qSet, len = 160) {
 const text = String(body || '');
 const lower = text.toLowerCase();
 let idx = -1;
 for (const t of qSet) { const i = lower.indexOf(t); if (i >= 0 && (idx === -1 || i < idx)) idx = i; }
 if (idx === -1) return text.slice(0, len) + (text.length > len ? '…' : '');
 const start = Math.max(0, idx - 40);
 return (start > 0 ? '…' : '') + text.slice(start, start + len) + (start + len < text.length ? '…' : '');
}

module.exports = { search, _snippet };
