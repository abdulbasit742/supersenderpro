// lib/automationRules/engine.js — The core. emit(event, payload) finds matching active rules,
// evaluates each rule's safe JSON condition, applies per-rule throttle/dedupe, then runs the rule's
// ordered action pipeline by delegating to lib/automationRules/actions (which call other depts).
// When config.dryRun is on, actions are PLANNED + logged but not executed. Every run is recorded.

const store = require('./store');
const { config } = require('./config');
const ruleStore = require('./ruleStore');
const { matches } = require('./conditionMatcher');
const actions = require('./actions');

const MIN = 60 * 1000;

function _throttleKey(ruleId, ctx) {
 const disc = ctx.contact || ctx.ticket || ctx.conversationId || ctx.tenantId || '';
 return `${ruleId}:${disc}`;
}
function _throttled(d, key, mins, refNow) {
 if (!mins) return false;
 const last = d.throttle[key];
 return last ? (refNow - Date.parse(last)) < mins * MIN : false;
}
function _log(d, rec) { d.runs.push(rec); if (d.runs.length > config.maxRunLog) d.runs = d.runs.slice(-config.maxRunLog); }

async function emit(event, payload = {}, refNow = Date.now()) {
 if (!config.enabled) return { event, fired: [], skipped: 'engine disabled' };
 if (!event) throw new Error('event is required');
 const ctx = Object.assign({ event }, payload || {});
 const rules = ruleStore.forEvent(event);
 const d = store.load();
 const fired = []; const throttledOut = [];

 for (const rule of rules) {
 if (!matches(ctx, rule.condition)) continue;
 const key = _throttleKey(rule.id, ctx);
 if (_throttled(d, key, rule.throttleMinutes, refNow)) { throttledOut.push(rule.id); continue; }

 const results = [];
 if (config.dryRun) {
 for (const a of rule.actions) results.push({ type: a.type, ok: true, planned: true });
 } else {
 for (const a of rule.actions) results.push(await actions.execute(a, ctx)); // eslint-disable-line no-await-in-loop
 }
 const ranAt = store.nowIso();
 const rrule = d.rules.find((r) => r.id === rule.id);
 if (rrule) { rrule.runCount = (rrule.runCount || 0) + 1; rrule.lastRunAt = ranAt; }
 d.throttle[key] = ranAt;
 _log(d, { id: store.genId('run'), ruleId: rule.id, event, at: ranAt, dryRun: config.dryRun, contact: ctx.contact ? true : false, actions: results });
 fired.push({ ruleId: rule.id, actions: results, dryRun: config.dryRun, ok: results.every((r) => r.ok) });
 }
 store.save(d);
 return { event, matchedRules: fired.length, throttled: throttledOut.length, fired };
}

function runs(limit = 100, ruleId = null) {
 let items = store.load().runs.slice();
 if (ruleId) items = items.filter((r) => r.ruleId === ruleId);
 return items.slice(-limit).reverse();
}
function overview() {
 const d = store.load();
 const actionsRun = d.runs.reduce((s, r) => s + (r.actions ? r.actions.length : 0), 0);
 const actionsFailed = d.runs.reduce((s, r) => s + (r.actions ? r.actions.filter((a) => a.ok === false).length : 0), 0);
 return {
 generatedAt: store.nowIso(),
 dryRun: config.dryRun,
 cards: { rules: d.rules.length, active: d.rules.filter((r) => r.active !== false).length, runs: d.runs.length, actionsRun, actionsFailed },
 };
}

module.exports = { emit, runs, overview };
