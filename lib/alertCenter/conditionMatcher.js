// lib/alertCenter/conditionMatcher.js — Safe JSON condition matching against an event payload.
// NO eval / no code execution: a condition is a small rule tree (all/any of leaf comparisons)
// evaluated against the flattened event { event, ...payload }. Supports dotted field paths.

function _get(obj, path) {
 return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function _leaf(ctx, cond) {
 const actual = cond.field === 'event' ? ctx.event : _get(ctx, cond.field);
 const val = cond.value;
 switch (cond.op || 'eq') {
 case 'eq': return String(actual) === String(val);
 case 'neq': return String(actual) !== String(val);
 case 'contains': return String(actual == null ? '' : actual).toLowerCase().includes(String(val).toLowerCase());
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

function matches(ctx, condition) {
 if (!condition || typeof condition !== 'object') return true; // no condition => event-name match only
 if (Array.isArray(condition.all)) return condition.all.every((c) => matches(ctx, c));
 if (Array.isArray(condition.any)) return condition.any.some((c) => matches(ctx, c));
 return _leaf(ctx, condition);
}

module.exports = { matches };
