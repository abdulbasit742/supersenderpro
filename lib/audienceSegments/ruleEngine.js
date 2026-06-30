// lib/audienceSegments/ruleEngine.js — Evaluate a segment's rule tree against a normalized
// contact. A segment has match: 'all' (AND) | 'any' (OR) and an array of conditions.
//
// condition: { field, op, value }
//   field: 'tag' | 'name' | 'contact' | 'lastActiveDays' | 'totalSpend' | 'createdDays' | 'attr:<key>'
//   op: eq, neq, contains, not_contains, gt, gte, lt, lte, in, not_in, exists, not_exists,
//       has_tag, not_has_tag
// Pure functions, no side effects, no external calls.

const OPS = ['eq', 'neq', 'contains', 'not_contains', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'exists', 'not_exists', 'has_tag', 'not_has_tag'];
const DAY = 24 * 60 * 60 * 1000;

function _daysSince(iso, refNow) {
 if (!iso) return null;
 const ms = Date.parse(iso);
 if (Number.isNaN(ms)) return null;
 return (refNow - ms) / DAY;
}

function _resolveField(field, contact, refNow) {
 if (field === 'tag' || field === 'tags') return contact.tags || [];
 if (field === 'name') return contact.name || '';
 if (field === 'contact') return contact.contact || '';
 if (field === 'totalSpend') return Number(contact.totalSpend || 0);
 if (field === 'lastActiveDays') return _daysSince(contact.lastActiveAt, refNow);
 if (field === 'createdDays') return _daysSince(contact.createdAt, refNow);
 if (field && field.startsWith('attr:')) {
 const key = field.slice(5);
 return (contact.attributes || {})[key];
 }
 return undefined;
}

function _asArray(v) { return Array.isArray(v) ? v : (v === undefined || v === null ? [] : String(v).split(',').map((s) => s.trim())); }

function evalCondition(cond, contact, refNow = Date.now()) {
 const { field, op } = cond;
 const value = cond.value;
 const actual = _resolveField(field, contact, refNow);
 switch (op) {
 case 'exists': return actual !== undefined && actual !== null && actual !== '';
 case 'not_exists': return actual === undefined || actual === null || actual === '';
 case 'has_tag': return (contact.tags || []).map(String).includes(String(value));
 case 'not_has_tag': return !(contact.tags || []).map(String).includes(String(value));
 case 'eq': return String(actual) === String(value);
 case 'neq': return String(actual) !== String(value);
 case 'contains': return String(actual ?? '').toLowerCase().includes(String(value).toLowerCase());
 case 'not_contains': return !String(actual ?? '').toLowerCase().includes(String(value).toLowerCase());
 case 'gt': return Number(actual) > Number(value);
 case 'gte': return Number(actual) >= Number(value);
 case 'lt': return actual !== null && actual !== undefined && Number(actual) < Number(value);
 case 'lte': return actual !== null && actual !== undefined && Number(actual) <= Number(value);
 case 'in': return _asArray(value).map(String).includes(String(actual));
 case 'not_in': return !_asArray(value).map(String).includes(String(actual));
 default: return false;
 }
}

function matches(segment, contact, refNow = Date.now()) {
 const conds = Array.isArray(segment.conditions) ? segment.conditions : [];
 if (!conds.length) return true; // empty segment = everyone
 const results = conds.map((c) => evalCondition(c, contact, refNow));
 return (segment.match === 'any') ? results.some(Boolean) : results.every(Boolean);
}

function validateConditions(conds) {
 if (!Array.isArray(conds)) throw new Error('conditions must be an array');
 conds.forEach((c, i) => {
 if (!c.field) throw new Error(`condition ${i}: field required`);
 if (!OPS.includes(c.op)) throw new Error(`condition ${i}: invalid op '${c.op}'`);
 });
 return true;
}

module.exports = { OPS, evalCondition, matches, validateConditions };
