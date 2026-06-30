'use strict';
/**
 * workflowEngine.js — Workflow Builder Feature #1: the automation glue (if-this-then-that).
 *
 * Every department now emits events (order, payment_received, stage_change, optout, ...). This engine
 * lets a user wire those events to actions WITHOUT code: when <trigger> and <conditions> then do
 * <actions, in order>. It's the n8n-style layer that connects CRM + payments + marketing into one
 * automated system.
 *
 * A workflow:
 *   {
 *     id, name, active,
 *     trigger: 'payment_received',
 *     match: 'all' | 'any',
 *     conditions: [ { field, op, value } ],   // evaluated against the event context
 *     actions:    [ { type, params } ]         // dispatched in order via injected handlers
 *   }
 *
 * Action handlers are INJECTED (registerAction), so this module has zero hard deps on the other
 * departments — server.js wires 'send_message', 'add_tag', 'enroll_drip', 'open_dunning', etc. to the
 * real implementations. Unknown/failing actions are logged and skipped; one bad action never aborts
 * the rest.
 *
 * Storage: JSON (data/workflows.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'workflows.json');

// Reuse the same operator semantics as the marketing segment engine for consistency.
const OPERATORS = {
  eq:  (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt:  (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt:  (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a == null ? '' : a).toLowerCase().includes(String(b).toLowerCase()),
  in:  (a, b) => Array.isArray(b) && b.map(String).includes(String(a)),
  exists: (a) => a !== undefined && a !== null && a !== '',
  empty:  (a) => a === undefined || a === null || a === ''
};
const VALID_OPS = Object.keys(OPERATORS);

// Injected action handlers: name -> async (params, ctx) => any
const actionHandlers = {};
function registerAction(name, fn) { if (typeof fn === 'function') actionHandlers[name] = fn; return Object.keys(actionHandlers); }
function registeredActions() { return Object.keys(actionHandlers); }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { workflows: [], runs: [] }; }
  catch { return { workflows: [], runs: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function evalCondition(ctx, rule) {
  const fn = OPERATORS[rule.op];
  if (!fn) return false;
  const actual = ctx ? ctx[rule.field] : undefined;
  if (rule.op === 'exists' || rule.op === 'empty') return fn(actual);
  return fn(actual, rule.value);
}
function conditionsPass(workflow, ctx) {
  const rules = Array.isArray(workflow.conditions) ? workflow.conditions : [];
  if (!rules.length) return true;
  const results = rules.map(r => evalCondition(ctx, r));
  return workflow.match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function validate(wf) {
  if (!wf.name) throw new Error('workflow needs a name');
  if (!wf.trigger) throw new Error('workflow needs a trigger event');
  for (const c of (wf.conditions || [])) {
    if (!c.field || !VALID_OPS.includes(c.op)) throw new Error(`bad condition (field/op). ops: ${VALID_OPS.join(', ')}`);
  }
  if (!Array.isArray(wf.actions) || !wf.actions.length) throw new Error('workflow needs at least one action');
  for (const a of wf.actions) if (!a.type) throw new Error('each action needs a type');
  return true;
}

function createWorkflow(wf = {}) {
  validate(wf);
  const data = load();
  const workflow = {
    id: `WF-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: wf.name,
    active: wf.active !== false,
    trigger: wf.trigger,
    match: wf.match === 'any' ? 'any' : 'all',
    conditions: wf.conditions || [],
    actions: wf.actions,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    runCount: 0
  };
  data.workflows.push(workflow);
  save(data);
  return workflow;
}
function listWorkflows(trigger) {
  const data = load();
  return trigger ? data.workflows.filter(w => w.trigger === trigger) : data.workflows;
}
function getWorkflow(id) { return load().workflows.find(w => w.id === id) || null; }
function setActive(id, active) {
  const data = load();
  const w = data.workflows.find(x => x.id === id);
  if (!w) return null;
  w.active = !!active; w.updatedAt = nowIso();
  save(data);
  return w;
}
function deleteWorkflow(id) {
  const data = load();
  const before = data.workflows.length;
  data.workflows = data.workflows.filter(w => w.id !== id);
  save(data);
  return { deleted: before - data.workflows.length };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
async function runActions(workflow, ctx) {
  const results = [];
  for (const action of workflow.actions) {
    const handler = actionHandlers[action.type];
    if (!handler) { results.push({ type: action.type, status: 'skipped', reason: 'no handler' }); continue; }
    try {
      const out = await handler(action.params || {}, ctx);
      results.push({ type: action.type, status: 'ok', out: out === undefined ? null : out });
    } catch (e) {
      results.push({ type: action.type, status: 'error', error: e.message });
    }
  }
  return results;
}

/**
 * Fire an event. Every active workflow on this trigger whose conditions pass runs its actions.
 * @param {string} event  e.g. 'payment_received', 'order', 'stage_change', 'optout'
 * @param {object} ctx     event context (becomes the condition + action data)
 * @returns {Promise<object>} summary of which workflows ran
 */
async function emit(event, ctx = {}) {
  const data = load();
  const matches = data.workflows.filter(w => w.active && w.trigger === event && conditionsPass(w, ctx));
  const ran = [];
  for (const wf of matches) {
    const results = await runActions(wf, ctx);
    wf.runCount = (wf.runCount || 0) + 1;
    data.runs.unshift({ workflowId: wf.id, event, at: nowIso(), results });
    ran.push({ workflowId: wf.id, name: wf.name, results });
  }
  if (data.runs.length > 1000) data.runs = data.runs.slice(0, 1000);
  save(data);
  return { event, ranCount: ran.length, ran };
}

function recentRuns(limit = 50) {
  return load().runs.slice(0, Math.max(1, Number(limit) || 50));
}

module.exports = {
  registerAction,
  registeredActions,
  createWorkflow,
  listWorkflows,
  getWorkflow,
  setActive,
  deleteWorkflow,
  emit,
  recentRuns,
  VALID_OPS
};
