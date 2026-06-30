// lib/automationRules/ruleStore.js — CRUD for automation rules. A rule:
// { id, name, event, condition?, actions:[{ type, ...spec }], throttleMinutes, active }.
// Rules are deactivated, never hard-deleted. Action specs are validated against the known types.

const store = require('./store');
const { config, KNOWN_EVENTS, ACTION_TYPES } = require('./config');

function _validateActions(actions) {
 if (!Array.isArray(actions) || !actions.length) throw new Error('at least one action is required');
 if (actions.length > config.maxActionsPerRule) throw new Error('too many actions (max ' + config.maxActionsPerRule + ')');
 const bad = actions.filter((a) => !a || !ACTION_TYPES.includes(a.type));
 if (bad.length) throw new Error('unknown action type(s); allowed: ' + ACTION_TYPES.join(', '));
 return actions;
}

function publicView(r) {
 if (!r) return null;
 return { id: r.id, name: r.name, event: r.event, condition: r.condition || null, actions: r.actions, throttleMinutes: r.throttleMinutes, active: r.active, runCount: r.runCount || 0, lastRunAt: r.lastRunAt || null, createdAt: r.createdAt };
}

function upsert(input = {}) {
 if (!input.event) throw new Error('event is required');
 const actions = _validateActions(input.actions);
 const d = store.load();
 const now = store.nowIso();
 const rec = {
 id: input.id || store.genId('rule'),
 name: input.name || input.event,
 event: String(input.event),
 condition: input.condition || null,
 actions,
 throttleMinutes: Number(input.throttleMinutes) >= 0 ? Number(input.throttleMinutes) : config.defaultThrottleMinutes,
 active: input.active === undefined ? true : !!input.active,
 runCount: 0, lastRunAt: null,
 };
 const idx = d.rules.findIndex((r) => r.id === rec.id);
 if (idx >= 0) { rec.createdAt = d.rules[idx].createdAt; rec.runCount = d.rules[idx].runCount || 0; rec.lastRunAt = d.rules[idx].lastRunAt || null; rec.updatedAt = now; d.rules[idx] = rec; }
 else { rec.createdAt = now; rec.updatedAt = now; d.rules.push(rec); }
 store.save(d);
 return publicView(rec);
}

function all() { return store.load().rules.map(publicView); }
function get(id) { return publicView(store.load().rules.find((r) => r.id === id)); }
function forEvent(event) { return store.load().rules.filter((r) => r.active !== false && r.event === event); }
function setActive(id, active) { const d = store.load(); const r = d.rules.find((x) => x.id === id); if (!r) throw new Error('rule not found'); r.active = !!active; r.updatedAt = store.nowIso(); store.save(d); return publicView(r); }
function remove(id) { const d = store.load(); d.rules = d.rules.filter((r) => r.id !== id); store.save(d); return true; }

module.exports = { upsert, all, get, forEvent, setActive, remove, publicView, KNOWN_EVENTS, ACTION_TYPES };
