// lib/templateLibrary/templateStore.js — CRUD + versioning for templates. Editing the body pushes
// the previous body onto a capped version history. Templates are archived, never hard-deleted.
// Seeds a couple of starter templates on first use.

const store = require('./store');
const { config, CATEGORIES } = require('./config');
const variables = require('./variables');

const DEFAULTS = [
 { id: 'welcome-basic', name: 'Welcome', category: 'welcome', body: 'Hi {{name|there}}, welcome to {{business|our store}}! Reply here anytime you need help.' },
 { id: 'order-confirm', name: 'Order confirmation', category: 'transactional', body: 'Hi {{name}}, your order {{orderId}} is confirmed. Total: {{currency|Rs}} {{amount}}. Thank you!' },
 { id: 'cart-reminder', name: 'Abandoned cart', category: 'reminder', body: '{{name|Hi}}, you left items in your cart. Complete your order: {{link}}' },
];

function _seed() { const d = store.load(); if (!d.templates.length) { d.templates = DEFAULTS.map((t) => ({ ...t, tags: [], variables: variables.extract(t.body).map((v) => v.name), version: 1, history: [], active: true, createdAt: store.nowIso(), updatedAt: store.nowIso() })); store.save(d); } return d.templates; }

function publicView(t) {
 if (!t) return null;
 return { id: t.id, name: t.name, category: t.category, tags: t.tags || [], body: t.body, variables: t.variables || [], version: t.version || 1, active: t.active !== false, createdAt: t.createdAt, updatedAt: t.updatedAt };
}

function all({ category, tag, includeArchived = false } = {}) {
 let items = _seed();
 if (!includeArchived) items = items.filter((t) => t.active !== false);
 if (category) items = items.filter((t) => t.category === category);
 if (tag) items = items.filter((t) => (t.tags || []).includes(String(tag)));
 return items.map(publicView);
}
function get(id) { _seed(); return publicView(store.load().templates.find((t) => t.id === id)); }

function upsert(input = {}) {
 if (input.body === undefined && !input.id) throw new Error('body is required');
 if (input.category && !CATEGORIES.includes(input.category)) throw new Error('unknown category: ' + input.category);
 _seed();
 const d = store.load();
 const now = store.nowIso();
 const idx = d.templates.findIndex((t) => t.id === input.id);
 if (idx >= 0) {
 const cur = d.templates[idx];
 // Version bump when the body changes.
 if (input.body !== undefined && input.body !== cur.body) {
 cur.history = Array.isArray(cur.history) ? cur.history : [];
 cur.history.push({ version: cur.version || 1, body: cur.body, at: cur.updatedAt });
 if (cur.history.length > config.maxVersionsPerTemplate) cur.history = cur.history.slice(-config.maxVersionsPerTemplate);
 cur.version = (cur.version || 1) + 1;
 cur.body = input.body;
 cur.variables = variables.extract(input.body).map((v) => v.name);
 }
 if (input.name !== undefined) cur.name = input.name;
 if (input.category !== undefined) cur.category = input.category;
 if (Array.isArray(input.tags)) cur.tags = input.tags.map(String);
 cur.updatedAt = now;
 store.save(d);
 return publicView(cur);
 }
 const rec = {
 id: input.id || store.genId('tpl'), name: input.name || 'Untitled', category: input.category || 'general',
 tags: Array.isArray(input.tags) ? input.tags.map(String) : [], body: String(input.body || ''),
 variables: variables.extract(input.body || '').map((v) => v.name), version: 1, history: [], active: true,
 createdAt: now, updatedAt: now,
 };
 d.templates.push(rec); store.save(d);
 return publicView(rec);
}

function archive(id) { const d = store.load(); const t = d.templates.find((x) => x.id === id); if (!t) throw new Error('template not found'); t.active = false; t.updatedAt = store.nowIso(); store.save(d); return publicView(t); }
function history(id) { _seed(); const t = store.load().templates.find((x) => x.id === id); return t ? (t.history || []).slice().reverse() : null; }

module.exports = { all, get, upsert, archive, history, publicView, DEFAULTS };
