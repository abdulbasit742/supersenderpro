'use strict';
/**
 * workflowEngine.js — Workflow Builder department: the glue between every other department.
 *
 * A workflow = TRIGGER + optional CONDITIONS + ordered ACTIONS:
 *   - trigger:   an event name, e.g. 'order.paid', 'lead.created', 'message.received'
 *   - conditions: rules over the event context (same operator style as segments)
 *   - actions:   [{ type, params }] run in order by injected handlers
 *
 * You wire ACTION HANDLERS once (registerAction), then anything in the app can `emit(event, ctx)`
 * and every matching workflow runs. This is the real engine the old `automationWorkflows.js` only
 * pretended to be (it saved workflows but nothing ever executed them).
 *
 * Non-blocking + safe: a failing action is logged and (by default) does not abort the run; one bad
 * workflow never takes down the emitter.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'workflows.json');
const LOG_FILE = path.join(__dirname, '..', '..', 'data', 'workflow_runs.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { workflows: [] }; }
  catch { return { workflows: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
function logRun(entry) {
  try {
    const rows = fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : [];
    rows.unshift({ at: new Date().toISOString(), ...entry });
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, JSON.stringify(rows.slice(0, 1000), null, 2));
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Condition operators (mirrors the segment engine for consistency)
// ---------------------------------------------------------------------------
const OPERATORS = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a == null ? '' : a).toLowerCase().includes(String(b).toLowerCase()),
  in: (a, b) => Array.isArray(b) && b.map(String).includes(String(a)),
  exists: (a) => a !== undefined && a !== null && a !== ''
};

// Read a dotted path from the event context, e.g. 'order.total'.
function getPath(obj, pathStr) {
  return String(pathStr).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function conditionPasses(ctx, cond) {
  const fn = OPERATORS[cond.op];
  if (!fn) return false;
  const actual = getPath(ctx, cond.field);
  if (cond.op === 'exists') return fn(actual);
  return fn(actual, cond.value);
}

function conditionsPass(ctx, workflow) {
  const conds = Array.isArray(workflow.conditions) ? workflow.conditions : [];
  if (!conds.length) return true;
  const results = conds.map(c => conditionPasses(ctx, c));
  return workflow.match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

// ---------------------------------------------------------------------------
// Action handlers (injected)
// ---------------------------------------------------------------------------
// handler signature: async (params, ctx) => any
const actionHandlers = new Map();
function registerAction(type, handler) {
  if (typeof handler === 'function') actionHandlers.set(type, handler);
  return [...actionHandlers.keys()];
}
function registeredActions() { return [...actionHandlers.keys()]; }

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function createWorkflow(def = {}) {
  if (!def.trigger) throw new Error('workflow needs a trigger (event name)');
  if (!Array.isArray(def.actions) || !def.actions.length) throw new Error('workflow needs at least one action');
  const data = load();
  const wf = {
    id: `WF-${Date.now()}`,
    name: def.name || def.trigger,
    trigger: def.trigger,
    conditions: def.conditions || [],
    match: def.match === 'any' ? 'any' : 'all',
    actions: def.actions,
    active: def.active !== false,
    haltOnError: !!def.haltOnError,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.workflows.push(wf);
  save(data);
  return wf;
}
function listWorkflows(trigger) {
  const data = load();
  return trigger ? data.workflows.filter(w => w.trigger === trigger) : data.workflows;
}
function getWorkflow(id) { return load().workflows.find(w => w.id === id) || null; }
function setActive(id, active) {
  const data = load();
  const wf = data.workflows.find(w => w.id === id);
  if (!wf) return null;
  wf.active = !!active; wf.updatedAt = new Date().toISOString();
  save(data);
  return wf;
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
async function runWorkflow(wf, ctx) {
  const run = { workflowId: wf.id, trigger: wf.trigger, actions: [], status: 'ok' };
  for (let i = 0; i < wf.actions.length; i++) {
    const action = wf.actions[i];
    const handler = actionHandlers.get(action.type);
    if (!handler) {
      run.actions.push({ type: action.type, status: 'skipped', error: 'no handler registered' });
      continue;
    }
    try {
      const result = await handler(action.params || {}, ctx);
      run.actions.push({ type: action.type, status: 'ok', result: result === undefined ? null : result });
    } catch (err) {
      run.actions.push({ type: action.type, status: 'failed', error: err.message });
      run.status = 'partial';
      if (wf.haltOnError) { run.status = 'halted'; break; }
    }
  }
  logRun(run);
  return run;
}

/**
 * Fire an event. Every active workflow whose trigger matches and whose conditions pass will run.
 * Non-blocking for the caller in spirit: await it if you need the results, or fire-and-forget.
 * @returns {Promise<{event, matched, runs}>}
 */
async function emit(event, ctx = {}) {
  const workflows = listWorkflows(event).filter(w => w.active && conditionsPass(ctx, w));
  const runs = [];
  for (const wf of workflows) {
    try { runs.push(await runWorkflow(wf, ctx)); }
    catch (err) { runs.push({ workflowId: wf.id, status: 'error', error: err.message }); }
  }
  return { event, matched: workflows.length, runs };
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
  OPERATORS
};
