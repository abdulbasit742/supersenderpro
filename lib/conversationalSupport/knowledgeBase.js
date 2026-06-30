'use strict';
/**
 * lib/conversationalSupport/knowledgeBase.js - tenant-scoped FAQ knowledge base with a tiny,
 * dependency-free keyword retriever (token overlap + IDF weighting). Good enough to ground the
 * agent's answers without any vector DB; the LLM then phrases the final reply.
 */
const { paths } = require('./config');
const store = require('./store');

const STOP = new Set(('a an the is are am to of for and or in on at it this that with my your you i we he she they them me how do does can will what when where which who why please pls kindly hai hain ka ki ke ko se me mein ap aap kya hy ho').split(/\s+/));

const tokenize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));

function list(tid) { return store.readJSON(paths.kb(tid), { entries: [] }).entries; }
function save(tid, entries) { return store.writeJSON(paths.kb(tid), { entries }).entries; }

function add(tid, { q, a, tags = [] } = {}) {
  if (!q || !a) throw new Error('q and a are required');
  const entries = list(tid);
  const entry = { id: 'kb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), q: String(q), a: String(a), tags: [].concat(tags || []).map(String), createdAt: new Date().toISOString() };
  entries.push(entry); save(tid, entries); return entry;
}
function bulkAdd(tid, items = []) { return (items || []).map((it) => add(tid, it)); }
function remove(tid, id) { const entries = list(tid); const next = entries.filter((e) => e.id !== id); save(tid, next); return entries.length - next.length; }

/** IDF over the KB so common words count less. */
function buildIdf(entries) {
  const df = new Map(); const N = entries.length || 1;
  for (const e of entries) {
    const seen = new Set(tokenize(e.q + ' ' + (e.tags || []).join(' ')));
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  return (t) => Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
}

/** Return best matches with a normalized 0..1 confidence (fully-covered query => ~1). */
function search(tid, query, topK = 3) {
  const entries = list(tid);
  if (!entries.length) return [];
  const idf = buildIdf(entries);
  const qToks = tokenize(query);
  if (!qToks.length) return [];
  const qSet = new Set(qToks);
  const denom = qToks.reduce((s, t) => s + idf(t), 0) || 1;
  const scored = entries.map((e) => {
    const eSet = new Set(tokenize(e.q + ' ' + (e.tags || []).join(' ')));
    let score = 0;
    for (const t of qSet) if (eSet.has(t)) score += idf(t);
    return { entry: e, confidence: Math.max(0, Math.min(1, score / denom)) };
  });
  return scored.filter((s) => s.confidence > 0).sort((a, b) => b.confidence - a.confidence).slice(0, topK);
}

module.exports = { list, add, bulkAdd, remove, search, tokenize };
