// lib/inboundWebhooks/mapper.js — Map a raw provider payload into a normalized internal event using
// a SAFE field-path mapping (no eval). A mapping is { event, fields: { target: 'a.b.c' | { path,
// default } } }. Dotted paths read nested values; array indices supported via numeric segments.
// The result is { event, ...mappedFields } ready to hand to automation #48 / alerts #28.

function _get(obj, p) {
 if (p === undefined || p === null) return undefined;
 return String(p).split('.').reduce((o, k) => {
 if (o == null) return undefined;
 const idx = /^\d+$/.test(k) ? Number(k) : k;
 return o[idx];
 }, obj);
}

// mapping.event may be a literal string OR a path spec { path } to read the event name from payload.
function resolveEvent(mapping, payload) {
 if (!mapping || !mapping.event) return 'webhook.received';
 if (typeof mapping.event === 'string') return mapping.event;
 if (mapping.event.path) { const v = _get(payload, mapping.event.path); return v !== undefined ? String(v) : (mapping.event.default || 'webhook.received'); }
 return 'webhook.received';
}

function apply(mapping, payload) {
 const out = { event: resolveEvent(mapping, payload) };
 const fields = (mapping && mapping.fields) || {};
 for (const [target, spec] of Object.entries(fields)) {
 let val;
 if (typeof spec === 'string') val = _get(payload, spec);
 else if (spec && typeof spec === 'object') { val = _get(payload, spec.path); if (val === undefined && spec.default !== undefined) val = spec.default; }
 if (val !== undefined) out[target] = (typeof val === 'object' ? JSON.stringify(val).slice(0, 200) : val);
 }
 return out;
}

module.exports = { apply, resolveEvent, _get };
