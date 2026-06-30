// lib/contacts/segmentEngine.js — Safe, rule-based dynamic segments. NO eval / no code execution:
// a segment is a small JSON rule tree (AND/OR of leaf conditions) evaluated against each contact.
// Supported leaf fields: tag, field:<name>, consent, status, lastActivityDays, createdDays.
// Operators: eq, neq, contains, exists, not_exists, gt, lt, gte, lte, in.

const store = require('./store');
const { config } = require('./config');
const contactStore = require('./contactStore');
const { maskPhone, maskEmail, maskName } = require('./privacy');

const DAY = 24 * 60 * 60 * 1000;

function _daysSince(iso, refNow) { if (!iso) return Infinity; return Math.floor((refNow - Date.parse(iso)) / DAY); }

function _leaf(contact, cond, refNow) {
 const op = cond.op || 'eq';
 const val = cond.value;
 let actual;
 switch (cond.field) {
 case 'tag':
 if (op === 'contains' || op === 'eq') return (contact.tags || []).includes(String(val));
 if (op === 'in') return Array.isArray(val) && val.some((v) => (contact.tags || []).includes(String(v)));
 return false;
 case 'consent': actual = contact.consent; break;
 case 'status': actual = contact.status; break;
 case 'lastActivityDays': actual = _daysSince(contact.lastActivityAt, refNow); break;
 case 'createdDays': actual = _daysSince(contact.createdAt, refNow); break;
 default:
 if (cond.field && cond.field.startsWith('field:')) {
 const key = cond.field.slice(6);
 actual = contact.fields ? contact.fields[key] : undefined;
 } else { return false; }
 }
 switch (op) {
 case 'eq': return String(actual) === String(val);
 case 'neq': return String(actual) !== String(val);
 case 'contains': return String(actual || '').toLowerCase().includes(String(val).toLowerCase());
 case 'exists': return actual !== undefined && actual !== null && actual !== '';
 case 'not_exists': return actual === undefined || actual === null || actual === '';
 case 'gt': return Number(actual) > Number(val);
 case 'lt': return Number(actual) < Number(val);
 case 'gte': return Number(actual) >= Number(val);
 case 'lte': return Number(actual) <= Number(val);
 case 'in': return Array.isArray(val) && val.map(String).includes(String(actual));
 default: return false;
 }
}

// rule = { all:[...] } | { any:[...] } | leaf. Nodes nest.
function matches(contact, rule, refNow = Date.now()) {
 if (!rule || typeof rule !== 'object') return true;
 if (Array.isArray(rule.all)) return rule.all.every((r) => matches(contact, r, refNow));
 if (Array.isArray(rule.any)) return rule.any.some((r) => matches(contact, r, refNow));
 return _leaf(contact, rule, refNow);
}

function _eligible(contact) {
 if (contact.status === 'archived') return false;
 if (config.excludeOptedOutFromSegments && contact.consent === 'opted_out') return false;
 return true;
}

function publicContact(c) {
 return { id: c.id, nameMasked: maskName(c.name), phoneMasked: maskPhone(c.phone), emailMasked: maskEmail(c.email), tags: c.tags || [], consent: c.consent, status: c.status, lastActivityAt: c.lastActivityAt };
}

// Evaluate a rule live against the contact book.
function evaluate(rule, { limit = config.maxSegmentPreview, includeOptedOut = false, refNow = Date.now() } = {}) {
 const contacts = contactStore.all().filter((c) => includeOptedOut ? c.status !== 'archived' : _eligible(c));
 const matched = contacts.filter((c) => matches(c, rule, refNow));
 return { total: matched.length, sample: matched.slice(0, limit).map(publicContact) };
}

// Saved segments (definition only; membership is always evaluated live).
function saveSegment({ id, name, rule, description } = {}) {
 if (!rule) throw new Error('rule is required');
 const d = store.load(); const now = store.nowIso();
 const idx = d.segments.findIndex((s) => s.id === id);
 if (idx >= 0) { d.segments[idx] = { ...d.segments[idx], name: name || d.segments[idx].name, rule, description: description || d.segments[idx].description, updatedAt: now }; store.save(d); return d.segments[idx]; }
 const seg = { id: id || store.genId('seg'), name: name || 'Untitled segment', description: description || '', rule, createdAt: now, updatedAt: now };
 d.segments.push(seg); store.save(d); return seg;
}
function listSegments() { return store.load().segments.map((s) => ({ ...s, count: evaluate(s.rule).total })); }
function getSegment(id) { return store.load().segments.find((s) => s.id === id) || null; }
// Resolve a saved segment to contact identifiers for downstream sends (respects consent).
function resolveRecipients(id, { limit = config.maxSegmentPreview } = {}) {
 const seg = getSegment(id); if (!seg) throw new Error('segment not found');
 const contacts = contactStore.all().filter(_eligible).filter((c) => matches(c, seg.rule));
 return contacts.slice(0, limit).map((c) => ({ id: c.id, phone: c.phone, email: c.email }));
}

module.exports = { matches, evaluate, saveSegment, listSegments, getSegment, resolveRecipients, publicContact };
