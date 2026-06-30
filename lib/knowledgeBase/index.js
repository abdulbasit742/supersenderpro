// lib/knowledgeBase/index.js — Knowledge Base (barrel export).
//
// Author help articles (title, body, category, tags) with a draft -> published -> archived
// workflow, and serve a dependency-free RANKED keyword search (term-frequency + field boosts for
// title/tags + an idf-ish rarity weight) over published articles. search() is what the AI
// auto-reply (#14) calls to ground answers, and what a public help widget queries. View tracking
// per published article.
//
// SAFETY: JSON-backed; PII-free (articles are help content, not customer data). Search defaults to
// published-only. Articles archived, never hard-deleted. This module never sends.

const { config, STATUSES } = require('./config');

module.exports = {
 config, STATUSES,
 store: require('./store'),
 tokenize: require('./tokenize'),
 search: require('./search').search,
 searchModule: require('./search'),
 articleStore: require('./articleStore'),
 doctor: require('./doctor'),
};
