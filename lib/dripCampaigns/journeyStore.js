// lib/dripCampaigns/journeyStore.js — CRUD for journey definitions. A journey has an id, name,
// a trigger event, an optional stopOnEvent, and an ordered list of steps. Steps are never
// hard-removed by editing in place — upsert replaces the whole definition atomically.
//
// step shape: { id, waitMinutes, message, mergeFields? }

const store = require('./store');

const VALID_TRIGGERS = ['signup', 'abandoned_cart', 'payment_success', 'inactivity', 'manual'];

function _norm(steps) {
 return (Array.isArray(steps) ? steps : []).map((s, i) => ({
 id: s.id || `step-${i + 1}`,
 waitMinutes: Number(s.waitMinutes) >= 0 ? Number(s.waitMinutes) : 0,
 message: String(s.message || ''),
 }));
}

function all() { return store.load().journeys; }
function get(id) { return all().find((j) => j.id === id) || null; }
function byTrigger(trigger) { return all().filter((j) => j.trigger === trigger && j.active !== false); }

function upsert(input = {}) {
 if (input.trigger && !VALID_TRIGGERS.includes(input.trigger)) throw new Error('invalid trigger: ' + input.trigger);
 const d = store.load();
 const now = store.nowIso();
 const idx = d.journeys.findIndex((j) => j.id === input.id);
 if (idx >= 0) {
 const cur = d.journeys[idx];
 d.journeys[idx] = {
 ...cur,
 name: input.name !== undefined ? input.name : cur.name,
 trigger: input.trigger !== undefined ? input.trigger : cur.trigger,
 stopOnEvent: input.stopOnEvent !== undefined ? input.stopOnEvent : cur.stopOnEvent,
 active: input.active !== undefined ? !!input.active : cur.active,
 steps: input.steps !== undefined ? _norm(input.steps) : cur.steps,
 updatedAt: now,
 };
 store.save(d);
 return d.journeys[idx];
 }
 const journey = {
 id: input.id || store.genId('jny'),
 name: input.name || 'Untitled journey',
 trigger: input.trigger || 'manual',
 stopOnEvent: input.stopOnEvent || null,
 active: input.active === undefined ? true : !!input.active,
 steps: _norm(input.steps),
 createdAt: now, updatedAt: now,
 };
 d.journeys.push(journey);
 store.save(d);
 return journey;
}

function setActive(id, active) {
 const d = store.load();
 const j = d.journeys.find((x) => x.id === id);
 if (!j) throw new Error('journey not found');
 j.active = !!active; j.updatedAt = store.nowIso();
 store.save(d);
 return j;
}

module.exports = { all, get, byTrigger, upsert, setActive, VALID_TRIGGERS };
