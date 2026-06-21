'use strict';
/** Simple keyword scoring search over KB articles. No external service. */
const articleStore = require('./articleStore');
function search(query, opts) {
  const q = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  let articles = articleStore.list(opts && opts.visibility ? { visibility: opts.visibility } : undefined);
  const scored = articles.map((a) => {
    const hay = (a.title + ' ' + a.summary + ' ' + (a.tags || []).join(' ') + ' ' + a.category).toLowerCase();
    const score = q.reduce((s, term) => s + (hay.includes(term) ? 1 : 0), 0);
    return { article: { id: a.id, title: a.title, slug: a.slug, category: a.category, summary: a.summary, visibility:
a.visibility }, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, (opts && opts.limit) || 8);

}
module.exports = { search };
