// lib/templateLibrary/templateStore.js — CRUD + versioning + approval workflow for templates.
// A template: { id, name, category, tags, body, variables (derived), status, version, history[],
// usageCount, lastUsedAt, createdAt, updatedAt }. Editing the body bumps the version and snapshots
// the prior body into history; editing also resets an approved template back to draft (so changes
// are re-reviewed). Templates are archived, never hard-deleted.

const store = require('./store');
const { config, STATUSES } = require('./config');
const variables = require('./variables');

function _derive(body) { return variables.parse(body); }

function publicView(t) {
 if (!t) return null;
 return {
 id: t.id, name: t.name, category: t.category || 'general', tags: t.tags || [],
 body: t.body, variables: t.variables || [], status: t.status, version: t.version,
 usageCount: t.usageCount || 0, lastUsedAt: t.lastUsedAt || null,
 createdAt: t.createdAt, updatedAt: t.updatedAt,
 };
}

function create({ name, body, category = 'general', tags = [] } = {}) {
 if (!name) throw new Error('name is required');
 if (body === undefined || body === null) throw new Error('body is required');
 const d = store.load();
 const now = store.nowIso();
 const t = {
 id: store.genId('tpl'), name: String(name), category: String(category),
 tags: Array.isArray(tags) ? tags.map(String) : [], body: String(body),
 variables: _derive(body), status: 'draft', version: 1, history: [],
 usageCount: 0, lastUsedAt: null, createdAt: now, updatedAt: now,
 };
 d.templates.push(t); store.save(d);
 return publicView(t);
}

function _get(d, id) { return d.templates.find((t) => t.id === id); }

function update(id, { name, body, category, tags } = {}) {
 const d = store.load(); const t = _get(d, id);
 if (!t) throw new Error('template not found');
 if (name !== undefined) t.name = String(name);
 if (category !== undefined) t.category = String(category);
 if (tags !== undefined) t.tags = Array.isArray(tags) ? tags.map(String) : t.tags;
 if (body !== undefined && String(body) !== t.body) {
 t.history.unshift({ version: t.version, body: t.body, at: store.nowIso() });
 if (t.history.length > config.maxVersionsKept) t.history = t.history.slice(0, config.maxVersionsKept);
 t.body = String(body); t.variables = _derive(body); t.version += 1;
 if (t.status === 'approved') t.status = 'draft'; // material change re-enters review
 }
 t.updatedAt = store.nowIso(); store.save(d);
 return publicView(t);
}

function setStatus(id, status) {
 if (!STATUSES.includes(status)) throw new Error('invalid status');
 const d = store.load(); const t = _get(d, id);
 if (!t) throw new Error('template not found');
 t.status = status; t.updatedAt = store.nowIso(); store.save(d);
 return publicView(t);
}
function submitForReview(id) { return setStatus(id, 'pending_review'); }
function approve(id) { return setStatus(id, 'approved'); }
function archive(id) { return setStatus(id, 'archived'); }

function recordUsage(id) {
 const d = store.load(); const t = _get(d, id);
 if (!t) return null;
 t.usageCount = (t.usageCount || 0) + 1; t.lastUsedAt = store.nowIso(); store.save(d);
 return publicView(t);
}

function list({ category, status, tag, q, limit = 200 } = {}) {
 let items = store.load().templates.slice();
 if (category) items = items.filter((t) => t.category === category);
 if (status) items = items.filter((t) => t.status === status);
 if (tag) items = items.filter((t) => (t.tags || []).includes(tag));
 if (q) { const s = String(q).toLowerCase(); items = items.filter((t) => t.name.toLowerCase().includes(s) || t.body.toLowerCase().includes(s)); }
 return items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit).map(publicView);
}
function get(id) { return publicView(_get(store.load(), id)); }
function raw(id) { return _get(store.load(), id) || null; }
function categories() { const set = new Set(store.load().templates.map((t) => t.category || 'general')); return [...set]; }

module.exports = { create, update, setStatus, submitForReview, approve, archive, recordUsage, list, get, raw, categories, publicView };
