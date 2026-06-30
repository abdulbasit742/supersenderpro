// lib/knowledgeBase/doctor.js — Offline self-check + posture snapshot for status routes.

const { config, STATUSES } = require('./config');
const store = require('./store');
const { search } = require('./search');
const { tokens } = require('./tokenize');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.articles));
 ok('tokenizer_ok', tokens('How do I reset my password?').includes('reset'), 'tokenizer drops stopwords, keeps content words');
 // Search returns an array even with an empty KB.
 ok('search_safe', Array.isArray(search('anything')), 'search returns an array');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, searchLimit: config.searchLimit, minScore: config.minScore, statuses: STATUSES },
 counts: { articles: d.articles.length, published: d.articles.filter((a) => a.status === 'published').length },
 checks,
 };
}

module.exports = { run };
