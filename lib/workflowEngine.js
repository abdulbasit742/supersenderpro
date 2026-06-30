'use strict';
/**
 * workflowEngine.js — the internal "if this, then that" automation engine that glues every
 * department together. This is the missing executor: `automationWorkflows.js` could only SAVE a
 * workflow, never RUN one. This module actually runs them, in-process, with no external n8n required.
 * (The existing n8nBridge stays for outbound integrations; this is the local brain.)
 *
 * Model:
 *   Workflow = { trigger, conditions[], actions[] }
 *     trigger:    an event name, e.g. 'order_created', 'contact_created', 'payment_received'
 *     conditions: optional rules evaluated against the event context (all must pass)
 *     actions:    ordered steps to execute, e.g. send_message, add_tag, wait, trigger_n8n
 *
 * Usage:
 *   const wf = require('./lib/workflowEngine');
 *   wf.registerAction('send_message', async (cfg, ctx) => { ... });   // wire real side-effects
 *   wf.emit('order_created', { contact, order });                    // fire an event
 *
 * Actions are PLUGGABLE: server.js (which has the WhatsApp client, CRM, broadcast hub) registers the
 * real handlers. The engine ships safe built-ins (wait, log, condition no-op) so it works standalone.
 */

const fs = require('fs');
const path = require('path');

let segmentEngine = null;
try { segmentEngine = require('./marketing/segmentEngine'); } catch { segmentEngine = null; }

const DATA_DIR = path.join(__dirname, '..', 'data');
const WF_FILE = path.join(DATA_DIR, 'workflows.json');
const RUN_FILE = path.join(DATA_DIR, 'workflow_runs.json');

function load(file, fallback) {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback; }
  catch { return fallback; }
}
function save(file, value) {
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
  catch { /* best-effort */ }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Condition evaluation (reuses the segment engine's operators where possible)
// ---------------------------------------------------------------------------
const OPS = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a == null ? '' : a).toLowerCase().includes(String(b).toLowerCase()),
  exists: (a) => a !== undefined && a !== null && a !== ''
};

// Read a dotted path out of the event context, e.g. 'order.total' or 'contact.city'.
function readPath(ctx, dotted) {
  return String(dotted || '').split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

function evaluateCondition(ctx, cond) {
  // Special condition: contact must belong to a saved segment.
  if (cond.type === 'in_segment') {
    if (!segmentEngine || !ctx.contact) return false;
    const seg = segmentEngine.getSegment(cond.segmentId);
    return seg ? segmentEngine.matchesSegment(ctx.contact, seg) : false;
  }
  const fn = OPS[cond.op];
  if (!fn) return false;
  const actual = readPath(ctx, cond.field);
  return cond.op === 'exists' ? fn(actual) : fn(actual, cond.value);
}

function conditionsPass(ctx, conditions) {
  if (!Array.isArray(conditions) || !conditions.length) return true;
  return conditions.every(c => {
    try { return evaluateCondition(ctx, c); } catch { return false; }
  });
}

// ---------------------------------------------------------------------------
// Action registry
// ---------------------------------------------------------------------------
const actionHandlers = new Map();

/** Register a real side-effect handler. handler(config, context) => any (may be async). */
function registerAction(type, handler) {
  if (typeof handler === 'function') actionHandlers.set(type, handler);
}

// Built-in, dependency-free actions so the engine is useful out of the box.
registerAction('wait', async (cfg) => {
  const ms = Number(cfg.ms != null ? cfg.ms : (Number(cfg.seconds || 0) * 1000));
  if (ms > 0) await sleep(Math.min(ms, 60000)); // cap inline waits at 60s; long waits => scheduler (later feature)
  return { waited: ms };
});
registerAction('log', async (cfg, ctx) => {
  console.log(`[workflow] ${cfg.message || 'log'}`, ctx.event ? `(event=${ctx.event})` : '');
  return { logged: true };
});

// ---------------------------------------------------------------------------
// Run logging
// ---------------------------------------------------------------------------
function logRun(entry) {
  const rows = load(RUN_FILE, []);
  rows.unshift({ id: `run_${Date.now()}_${Math.random().toString(16).slice(2)}`, at: new Date().toISOString(), ...entry });
  save(RUN_FILE, rows.slice(0, 1000));
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
async function runActions(workflow, ctx) {
  const steps = [];
  for (const action of (workflow.actions || [])) {
    const handler = actionHandlers.get(action.type);
    if (!handler) { steps.push({ type: action.type, status: 'skipped', reason: 'no handler registered' }); continue; }
    try {
      const result = await handler(action.config || action, ctx);
      steps.push({ type: action.type, status: 'ok', result: result ?? null });
    } catch (err) {
      steps.push({ type: action.type, status: 'failed', error: err.message });
      if (action.stopOnError) break;
    }
  }
  return steps;
}

/**
 * Fire an event. Every ACTIVE workflow whose trigger matches and whose conditions pass will run.
 * Returns a summary; never throws (so emitting an event can't crash the caller).
 */
async function emit(event, context = {}) {
  const ctx = { event, ...context };
  const data = load(WF_FILE, { workflows: [] });
  const matches = (data.workflows || []).filter(w => w.active !== false && w.trigger === event);
  const fired = [];
  for (const wf of matches) {
    if (!conditionsPass(ctx, wf.conditions)) {
      logRun({ workflowId: wf.id, event, status: 'skipped', reason: 'conditions not met' });
      continue;
    }
    const steps = await runActions(wf, ctx);
    const failed = steps.some(s => s.status === 'failed');
    logRun({ workflowId: wf.id, workflowName: wf.name, event, status: failed ? 'partial' : 'ok', steps });
    fired.push({ workflowId: wf.id, status: failed ? 'partial' : 'ok' });
  }
  return { event, matched: matches.length, fired };
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function createWorkflow({ name, trigger, conditions = [], actions = [], active = true, storeId = null }) {
  if (!name) throw new Error('workflow name is required');
  if (!trigger) throw new Error('workflow trigger (event name) is required');
  if (!Array.isArray(actions) || !actions.length) throw new Error('at least one action is required');
  const data = load(WF_FILE, { workflows: [] });
  const wf = {
    id: `WF-${Date.now()}`,
    storeId, name, trigger, conditions, actions, active,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.workflows.push(wf);
  save(WF_FILE, data);
  return wf;
}

function listWorkflows(storeId) {
  const data = load(WF_FILE, { workflows: [] });
  return storeId ? data.workflows.filter(w => w.storeId === storeId) : data.workflows;
}
function getWorkflow(id) {
  return load(WF_FILE, { workflows: [] }).workflows.find(w => w.id === id) || null;
}
function updateWorkflow(id, patch = {}) {
  const data = load(WF_FILE, { workflows: [] });
  const wf = data.workflows.find(w => w.id === id);
  if (!wf) return null;
  for (const k of ['name', 'trigger', 'conditions', 'actions', 'active']) {
    if (patch[k] !== undefined) wf[k] = patch[k];
  }
  wf.updatedAt = new Date().toISOString();
  save(WF_FILE, data);
  return wf;
}
function deleteWorkflow(id) {
  const data = load(WF_FILE, { workflows: [] });
  const before = data.workflows.length;
  data.workflows = data.workflows.filter(w => w.id !== id);
  save(WF_FILE, data);
  return { deleted: before - data.workflows.length };
}

function getRuns(limit = 50) {
  return load(RUN_FILE, []).slice(0, Math.max(1, Number(limit || 50)));
}

/** Which action types are wired right now (for the builder UI to show available steps). */
function getRegisteredActions() {
  return Array.from(actionHandlers.keys());
}

module.exports = {
  emit,
  registerAction,
  getRegisteredActions,
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getRuns
};
