'use strict';
/**
 * lib/chatbotBuilder/flows.js - tenant-scoped CRUD + validation for chatbot flows.
 *
 * Flow shape:
 *   { id, tenantId, name, status: 'draft'|'active',
 *     triggers: { keywords: [..], isDefault: bool },
 *     startNodeId, nodes: [ <node> ], createdAt, updatedAt }
 *
 * Node shapes (all have id + type; `next` is a nodeId or null = end):
 *   message  { type:'message',  text, next }
 *   question { type:'question', text, saveAs, next }
 *   choice   { type:'choice',   text, options:[{label,value,next}], fallbackNext }
 *   condition{ type:'condition',variable, op, value, ifTrue, ifFalse }
 *   ai       { type:'ai',       prompt, saveAs, next }
 *   action   { type:'action',   action:'set'|'tag', key, value, next }
 *   handoff  { type:'handoff',  text }            // terminal -> human agent
 *   end      { type:'end',      text }            // terminal
 */
const cfg = require('./config');
const { paths } = cfg;
const store = require('./store');
const { nowISO, id, norm } = require('./util');

const read = (tid) => store.readJSON(paths.flows(tid), { flows: [] });
const write = (tid, d) => store.writeJSON(paths.flows(tid), d);

function list(tid, filter = {}) {
  let flows = read(tid).flows;
  if (filter.status) flows = flows.filter((f) => f.status === filter.status);
  return flows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function get(tid, flowId) {
  return read(tid).flows.find((f) => f.id === flowId) || null;
}

function validate(flow) {
  const errors = [];
  if (!flow || typeof flow !== 'object') return { ok: false, errors: ['flow must be an object'] };
  if (!flow.name) errors.push('name is required');
  const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
  if (!nodes.length) errors.push('flow has no nodes');
  const ids = new Set();
  nodes.forEach((n, i) => {
    if (!n || !n.id) { errors.push('node[' + i + '] missing id'); return; }
    if (ids.has(n.id)) errors.push('duplicate node id: ' + n.id);
    ids.add(n.id);
    if (!cfg.nodeTypes.includes(n.type)) errors.push('node ' + n.id + ' has invalid type: ' + n.type);
  });
  if (flow.startNodeId && !ids.has(flow.startNodeId)) errors.push('startNodeId not found: ' + flow.startNodeId);
  const ref = (target, label) => { if (target != null && !ids.has(target)) errors.push('node ' + label + ' points to missing node: ' + target); };
  nodes.forEach((n) => {
    if (!n || !n.id) return;
    if (['message', 'question', 'ai', 'action'].includes(n.type)) ref(n.next, n.id + '.next');
    if (n.type === 'condition') { ref(n.ifTrue, n.id + '.ifTrue'); ref(n.ifFalse, n.id + '.ifFalse'); }
    if (n.type === 'choice') {
      (n.options || []).forEach((o, oi) => ref(o.next, n.id + '.options[' + oi + ']'));
      ref(n.fallbackNext, n.id + '.fallbackNext');
    }
  });
  return { ok: errors.length === 0, errors };
}

function create(tid, input = {}) {
  const data = read(tid);
  const flow = {
    id: id('flow'), tenantId: tid,
    name: input.name || 'Untitled flow',
    status: input.status === 'active' ? 'active' : 'draft',
    triggers: {
      keywords: Array.isArray(input.triggers && input.triggers.keywords) ? input.triggers.keywords.map(norm).filter(Boolean) : [],
      isDefault: !!(input.triggers && input.triggers.isDefault),
    },
    startNodeId: input.startNodeId || (Array.isArray(input.nodes) && input.nodes[0] ? input.nodes[0].id : null),
    nodes: Array.isArray(input.nodes) ? input.nodes : [],
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.flows.push(flow);
  write(tid, data);
  return flow;
}

function update(tid, flowId, updates = {}) {
  const data = read(tid);
  const f = data.flows.find((x) => x.id === flowId);
  if (!f) return null;
  ['name', 'startNodeId', 'nodes'].forEach((k) => { if (updates[k] !== undefined) f[k] = updates[k]; });
  if (updates.triggers) {
    f.triggers = {
      keywords: Array.isArray(updates.triggers.keywords) ? updates.triggers.keywords.map(norm).filter(Boolean) : f.triggers.keywords,
      isDefault: updates.triggers.isDefault !== undefined ? !!updates.triggers.isDefault : f.triggers.isDefault,
    };
  }
  if (updates.status && ['draft', 'active'].includes(updates.status)) f.status = updates.status;
  f.updatedAt = nowISO();
  write(tid, data);
  return f;
}

function setStatus(tid, flowId, status) {
  if (!['draft', 'active'].includes(status)) throw new Error('status must be draft|active');
  return update(tid, flowId, { status });
}

function remove(tid, flowId) {
  const data = read(tid);
  const before = data.flows.length;
  data.flows = data.flows.filter((f) => f.id !== flowId);
  write(tid, data);
  return data.flows.length < before;
}

/** Pick the active flow that should handle an inbound message (keyword match, else default). */
function match(tid, text) {
  const t = norm(text);
  const active = read(tid).flows.filter((f) => f.status === 'active');
  for (const f of active) {
    const kws = (f.triggers && f.triggers.keywords) || [];
    if (kws.some((k) => k && t.includes(k))) return f;
  }
  return active.find((f) => f.triggers && f.triggers.isDefault) || null;
}

module.exports = { list, get, validate, create, update, setStatus, remove, match };
