'use strict';
/**
 * menuFlow.js — Flows Feature #1: a no-code menu chatbot builder.
 *
 * Many businesses just want a simple "Reply 1 for Catalog, 2 for Order status, 3 to talk to a
 * human" menu before the AI agent kicks in. This builds those flows: nodes, each with a message and
 * numbered options that jump to other nodes. It tracks where each contact is and advances them as
 * they reply. Terminal/action nodes can hand off (start an order, escalate to support) via an
 * injected action hook.
 *
 * Sits in front of the AI support agent: structured menu first, free-form AI as fallback.
 * Storage: JSON (data/menu_flows.json) for flows + per-contact state.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'menu_flows.json');

let actionHook = null; // async (action, { phone, node, flow }) => string|void   (returns optional reply
function setActionHook(fn) { actionHook = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { flows: [], state: {} }; }
  catch { return { flows: [], state: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

/**
 * Create a flow.
 * @param {Object} opts { name, active?, startNode, nodes: { [id]: { message, options?:[{label, next?, action?}] , action? } } }
 */
function createFlow(opts = {}) {
  if (!opts.name) throw new Error('flow name required');
  if (!opts.startNode || !opts.nodes || !opts.nodes[opts.startNode]) throw new Error('startNode + nodes required');
  const data = load();
  const flow = {
    id: `FLOW-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    active: opts.active !== false,
    startNode: opts.startNode,
    nodes: opts.nodes,
    triggerKeywords: (opts.triggerKeywords || []).map(k => String(k).toLowerCase()),
    createdAt: nowIso()
  };
  data.flows.push(flow);
  save(data);
  return flow;
}

function listFlows() { return load().flows; }
function getFlow(id) { return load().flows.find(f => f.id === id) || null; }
function setActive(id, active) {
  const data = load();
  const f = data.flows.find(x => x.id === id);
  if (!f) return null;
  f.active = !!active; save(data); return f;
}

function renderNode(node) {
  let text = node.message || '';
  if (Array.isArray(node.options) && node.options.length) {
    text += '\n\n' + node.options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
  }
  return text;
}

/** Should this message start a flow? Returns the flow or null. */
function matchFlow(text) {
  const t = String(text || '').toLowerCase().trim();
  const data = load();
  return data.flows.find(f => f.active && f.triggerKeywords.some(k => t === k || t.includes(k))) || null;
}

/** Start a flow for a contact. Returns the first node's message. */
function start(phone, flowId) {
  const p = normPhone(phone);
  const data = load();
  const flow = data.flows.find(f => f.id === flowId);
  if (!flow) return null;
  data.state[p] = { flowId, nodeId: flow.startNode, startedAt: nowIso() };
  save(data);
  return { text: renderNode(flow.nodes[flow.startNode]), nodeId: flow.startNode, flowId };
}

/**
 * Advance a contact through their active flow based on their reply (a number or option text).
 * Returns { text, done, action? } or null if the contact isn't in a flow.
 */
async function advance(phone, input) {
  const p = normPhone(phone);
  const data = load();
  const st = data.state[p];
  if (!st) return null;
  const flow = data.flows.find(f => f.id === st.flowId);
  if (!flow) { delete data.state[p]; save(data); return null; }
  const node = flow.nodes[st.nodeId];
  const options = node.options || [];

  // resolve the chosen option (by number or label match)
  let choice = null;
  const num = parseInt(String(input).trim(), 10);
  if (!Number.isNaN(num) && options[num - 1]) choice = options[num - 1];
  else choice = options.find(o => String(input).toLowerCase().includes(o.label.toLowerCase()));

  if (!choice) {
    // invalid input: re-show the current node
    return { text: `Sorry, please pick a valid option.\n\n${renderNode(node)}`, done: false };
  }

  // action option -> hand off
  if (choice.action) {
    delete data.state[p]; save(data);
    let reply = `Got it.`;
    if (actionHook) { try { const r = await actionHook(choice.action, { phone: p, flow }); if (r) reply = r; } catch { /* ignore */ } }
    return { text: reply, done: true, action: choice.action };
  }

  // jump to next node
  const nextId = choice.next;
  const next = nextId && flow.nodes[nextId];
  if (!next) { delete data.state[p]; save(data); return { text: 'Thanks!', done: true }; }
  st.nodeId = nextId; save(data);
  return { text: renderNode(next), nodeId: nextId, done: false };
}

function inFlow(phone) { return !!load().state[normPhone(phone)]; }

module.exports = { setActionHook, createFlow, listFlows, getFlow, setActive, matchFlow, start, advance, inFlow };
