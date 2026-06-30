// lib/audienceSegments/segmentStore.js — CRUD for segment definitions. Segments are never
// hard-deleted; deactivate sets active=false. A segment owns: id, name, match, conditions[].

const store = require('./store');
const ruleEngine = require('./ruleEngine');

function all() { return store.load().segments; }
function get(id) { return all().find((s) => s.id === id) || null; }

function upsert(input = {}) {
 if (input.match && !['all', 'any'].includes(input.match)) throw new Error("match must be 'all' or 'any'");
 if (input.conditions !== undefined) ruleEngine.validateConditions(input.conditions);
 const d = store.load();
 const now = store.nowIso();
 const idx = d.segments.findIndex((s) => s.id === input.id);
 if (idx >= 0) {
 const cur = d.segments[idx];
 d.segments[idx] = {
 ...cur,
 name: input.name !== undefined ? input.name : cur.name,
 match: input.match !== undefined ? input.match : cur.match,
 conditions: input.conditions !== undefined ? input.conditions : cur.conditions,
 active: input.active !== undefined ? !!input.active : cur.active,
 updatedAt: now,
 };
 store.save(d);
 return d.segments[idx];
 }
 const seg = {
 id: input.id || store.genId('seg'),
 name: input.name || 'Untitled segment',
 match: input.match || 'all',
 conditions: input.conditions || [],
 active: input.active === undefined ? true : !!input.active,
 createdAt: now, updatedAt: now,
 };
 d.segments.push(seg);
 store.save(d);
 return seg;
}

function setActive(id, active) {
 const d = store.load();
 const s = d.segments.find((x) => x.id === id);
 if (!s) throw new Error('segment not found');
 s.active = !!active; s.updatedAt = store.nowIso();
 store.save(d);
 return s;
}

module.exports = { all, get, upsert, setActive };
