// lib/contacts/contactStore.js — Contact persistence + dedupe upsert. Contacts are never hard-
// deleted; they are archived (status='archived'). Identity is keyed by normalized phone/email so
// repeat captures merge instead of duplicating.

const store = require('./store');
const { config } = require('./config');
const { normalizePhone, normalizeEmail, identityKey } = require('./normalize');

function all() { return store.load().contacts; }
function getById(id) { return all().find((c) => c.id === id) || null; }
function getByKey(key) { return all().find((c) => c.identityKey === key) || null; }

// Create or merge a contact. Returns { contact, created }.
function upsert({ phone, email, name, tags, fields, source } = {}) {
 const country = config.defaultCountry;
 const key = identityKey({ phone, email }, country);
 if (!key) throw new Error('a phone or email is required');
 const d = store.load();
 const now = store.nowIso();
 const np = normalizePhone(phone, country);
 const ne = normalizeEmail(email);
 let c = d.contacts.find((x) => x.identityKey === key);
 let created = false;
 if (!c) {
 c = {
 id: store.genId('con'), identityKey: key,
 phone: np, email: ne, name: name || '',
 tags: [], fields: {}, status: 'active',
 consent: 'unknown', optedOutAt: null,
 source: source || 'manual',
 lastActivityAt: now, createdAt: now, updatedAt: now,
 };
 d.contacts.push(c);
 created = true;
 }
 // Merge non-destructively.
 if (np && !c.phone) c.phone = np;
 if (ne && !c.email) c.email = ne;
 if (name) c.name = name;
 if (Array.isArray(tags)) c.tags = Array.from(new Set([...(c.tags || []), ...tags.map(String)]));
 if (fields && typeof fields === 'object') c.fields = { ...(c.fields || {}), ...fields };
 c.updatedAt = now;
 store.save(d);
 return { contact: c, created };
}

function patch(id, changes = {}) {
 const d = store.load();
 const c = d.contacts.find((x) => x.id === id);
 if (!c) throw new Error('contact not found');
 ['name', 'status'].forEach((k) => { if (changes[k] !== undefined) c[k] = changes[k]; });
 if (changes.fields && typeof changes.fields === 'object') c.fields = { ...(c.fields || {}), ...changes.fields };
 c.updatedAt = store.nowIso();
 store.save(d);
 return c;
}

function addTags(id, tags = []) {
 const d = store.load(); const c = d.contacts.find((x) => x.id === id);
 if (!c) throw new Error('contact not found');
 c.tags = Array.from(new Set([...(c.tags || []), ...tags.map(String)])); c.updatedAt = store.nowIso();
 store.save(d); return c;
}
function removeTags(id, tags = []) {
 const d = store.load(); const c = d.contacts.find((x) => x.id === id);
 if (!c) throw new Error('contact not found');
 const rm = new Set(tags.map(String)); c.tags = (c.tags || []).filter((t) => !rm.has(t)); c.updatedAt = store.nowIso();
 store.save(d); return c;
}
function touchActivity(id, at) {
 const d = store.load(); const c = d.contacts.find((x) => x.id === id);
 if (!c) return null; c.lastActivityAt = at || store.nowIso(); store.save(d); return c;
}
function setConsent(id, consent) {
 const d = store.load(); const c = d.contacts.find((x) => x.id === id);
 if (!c) throw new Error('contact not found');
 c.consent = consent === 'opted_in' ? 'opted_in' : (consent === 'opted_out' ? 'opted_out' : 'unknown');
 c.optedOutAt = c.consent === 'opted_out' ? store.nowIso() : null;
 c.updatedAt = store.nowIso(); store.save(d); return c;
}
function archive(id) { return patch(id, { status: 'archived' }); }

module.exports = { all, getById, getByKey, upsert, patch, addTags, removeTags, touchActivity, setConsent, archive };
