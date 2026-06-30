// lib/knowledgeBase/articleStore.js — Author + manage KB articles. An article: { id, title, body,
// category, tags, status(draft|published|archived), views, createdAt, updatedAt, publishedAt }.
// Articles are archived, never hard-deleted. Editing keeps the same id; publish flips status.

const store = require('./store');
const { config, STATUSES } = require('./config');

function publicView(a, { full = false } = {}) {
 if (!a) return null;
 const base = { id: a.id, title: a.title, category: a.category || 'general', tags: a.tags || [], status: a.status, views: a.views || 0, createdAt: a.createdAt, updatedAt: a.updatedAt, publishedAt: a.publishedAt || null };
 return full ? { ...base, body: a.body } : base;
}

function create({ title, body, category = 'general', tags = [], status = 'draft' } = {}) {
 if (!title) throw new Error('title is required');
 if (body === undefined || body === null) throw new Error('body is required');
 if (!STATUSES.includes(status)) throw new Error('invalid status');
 const d = store.load();
 const now = store.nowIso();
 const a = {
 id: store.genId('kb'), title: String(title), body: String(body),
 category: String(category), tags: Array.isArray(tags) ? tags.map(String) : [],
 status, views: 0, createdAt: now, updatedAt: now, publishedAt: status === 'published' ? now : null,
 };
 d.articles.push(a); store.save(d);
 return publicView(a, { full: true });
}

function _get(d, id) { return d.articles.find((a) => a.id === id); }

function update(id, changes = {}) {
 const d = store.load(); const a = _get(d, id);
 if (!a) throw new Error('article not found');
 if (changes.title !== undefined) a.title = String(changes.title);
 if (changes.body !== undefined) a.body = String(changes.body);
 if (changes.category !== undefined) a.category = String(changes.category);
 if (changes.tags !== undefined) a.tags = Array.isArray(changes.tags) ? changes.tags.map(String) : a.tags;
 a.updatedAt = store.nowIso(); store.save(d);
 return publicView(a, { full: true });
}

function setStatus(id, status) {
 if (!STATUSES.includes(status)) throw new Error('invalid status');
 const d = store.load(); const a = _get(d, id);
 if (!a) throw new Error('article not found');
 a.status = status; a.updatedAt = store.nowIso();
 if (status === 'published' && !a.publishedAt) a.publishedAt = a.updatedAt;
 store.save(d);
 return publicView(a, { full: true });
}
function publish(id) { return setStatus(id, 'published'); }
function archive(id) { return setStatus(id, 'archived'); }

// Fetch an article + (optionally) bump its view count (for the published help widget).
function get(id, { countView = false } = {}) {
 const d = store.load(); const a = _get(d, id);
 if (!a) return null;
 if (countView && a.status === 'published') { a.views = (a.views || 0) + 1; store.save(d); }
 return publicView(a, { full: true });
}

function list({ status, category, tag, limit = 200 } = {}) {
 let items = store.load().articles.slice();
 if (status) items = items.filter((a) => a.status === status);
 if (category) items = items.filter((a) => a.category === category);
 if (tag) items = items.filter((a) => (a.tags || []).includes(tag));
 return items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit).map((a) => publicView(a));
}
function categories() { return [...new Set(store.load().articles.map((a) => a.category || 'general'))]; }

module.exports = { create, update, setStatus, publish, archive, get, list, categories, publicView };
