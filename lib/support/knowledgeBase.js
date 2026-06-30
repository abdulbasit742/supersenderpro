'use strict';
/**
 * knowledgeBase.js — Support Feature #2: the FAQ/knowledge base behind the AI agent.
 *
 * The AI support agent (#1) only answers well if it has facts to ground on. This stores your FAQs
 * and help articles and exposes a lightweight keyword search that returns the most relevant snippets
 * for a customer's question. Wire `kb.search` into the agent via `support.setKbLookup(...)`.
 *
 * Scoring is a simple keyword-overlap (no external deps, no embeddings) — good enough to ground
 * answers. When you later add local embeddings on PC #2, swap `search()` internals; the API stays.
 *
 * Storage: JSON (data/support_kb.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'support_kb.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { articles: [] }; }
  catch { return { articles: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

const STOP = new Set(['the','a','an','is','are','to','of','and','or','in','on','for','my','i','you','it','do','does','how','what','can','with','please','hi','hello']);
function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
}

function addArticle(opts = {}) {
  if (!opts.question && !opts.title) throw new Error('article needs a question/title');
  if (!opts.answer) throw new Error('article needs an answer');
  const data = load();
  const article = {
    id: `KB-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    title: opts.title || opts.question,
    question: opts.question || opts.title,
    answer: opts.answer,
    tags: Array.isArray(opts.tags) ? opts.tags.map(t => String(t).toLowerCase()) : [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  data.articles.push(article);
  save(data);
  return article;
}

function updateArticle(id, patch = {}) {
  const data = load();
  const a = data.articles.find(x => x.id === id);
  if (!a) return null;
  for (const f of ['title', 'question', 'answer']) if (patch[f] !== undefined) a[f] = patch[f];
  if (Array.isArray(patch.tags)) a.tags = patch.tags.map(t => String(t).toLowerCase());
  a.updatedAt = nowIso();
  save(data);
  return a;
}

function deleteArticle(id) {
  const data = load();
  const before = data.articles.length;
  data.articles = data.articles.filter(a => a.id !== id);
  save(data);
  return { deleted: before - data.articles.length };
}

function listArticles() { return load().articles; }

/**
 * Keyword search. Returns up to `limit` answer snippets, best match first.
 * Scoring: overlap of query tokens with article tokens, with title/tag matches weighted higher.
 * @returns {string[]} answer strings (ready to feed the AI agent as KB snippets)
 */
function search(query, limit = 5) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const data = load();
  const scored = [];
  for (const a of data.articles) {
    const titleTokens = new Set(tokenize(`${a.title} ${a.question}`));
    const bodyTokens = new Set(tokenize(a.answer));
    const tagSet = new Set((a.tags || []).map(String));
    let score = 0;
    for (const q of qTokens) {
      if (titleTokens.has(q)) score += 3;
      else if (tagSet.has(q)) score += 2;
      else if (bodyTokens.has(q)) score += 1;
    }
    if (score > 0) scored.push({ score, a });
  }
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, Math.max(1, Number(limit) || 5)).map(s => `Q: ${s.a.question}\nA: ${s.a.answer}`);
}

/** Bulk import FAQs at once. items: [{ question, answer, tags? }] */
function bulkImport(items = []) {
  let n = 0;
  for (const it of items) { try { addArticle(it); n++; } catch { /* skip bad row */ } }
  return { imported: n, total: items.length };
}

module.exports = { addArticle, updateArticle, deleteArticle, listArticles, search, bulkImport };
