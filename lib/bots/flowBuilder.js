'use strict';
/**
 * flowBuilder.js — Bots Feature #1: no-code menu chatbot flows.
 *
 * The AI agent (#support1) is great for open questions, but many businesses want a deterministic
 * menu bot: "Press 1 for orders, 2 for support, 3 to talk to a human". This is that builder: define
 * a flow as nodes + transitions, keep per-contact session state, and advance on each reply.
 *
 * Node types:
 *   message  — send text, then auto-advance to `next`
 *   menu     — send options; transition by the number/keyword the user replies
 *   input    — capture a free-text answer into session.data[key], then go to `next`
 *   handoff  — hand to a human / AI agent (ends the flow)
 *
 * step() is pure-ish: given a contact + their reply, it returns the next message(s) and persists
 * session state. The inbound router calls this before falling back to the AI agent.
 *
 * Storage: JSON (data/bot_flows.json) for flows + sessions.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'bot_flows.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { flows: [], sessions: {} }; }
  catch { return { flows: [], sessions: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
const SESSION_TTL_MS = 30 * 60000; // 30 min idle -> session resets

/**
 * Create a flow.
 * @param {Object} opts { name, trigger?, startNodeId, nodes: { id: node } }
 *   trigger: keyword that starts the flow (e.g. 'menu', 'hi'); optional
 *   node: { type, text?, options?:[{ match, next, label }], key?, next?, }
 */
function createFlow(opts = {}) {
  if (!opts.name) throw new Error('flow needs a name');
  if (!opts.startNodeId || !opts.nodes || !opts.nodes[opts.startNodeId]) throw new Error('valid startNodeId + nodes required');
  const data = load();
  const flow = {
    id: `FLOW-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    trigger: opts.trigger ? String(opts.trigger).toLowerCase() : null,
    startNodeId: opts.startNodeId,
    nodes: opts.nodes,
    active: opts.active !== false,
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

function findTriggeredFlow(text) {
  const t = String(text || '').trim().toLowerCase();
  return load().flows.find(f => f.active && f.trigger && (t === f.trigger || t.startsWith(f.trigger))) || null;
}

function getSession(data, phone) {
  const s = data.sessions[phone];
  if (!s) return null;
  if (nowMs() - s.updatedAt > SESSION_TTL_MS) { delete data.sessions[phone]; return null; }
  return s;
}

// Render a node into outgoing message text.
function renderNode(node) {
  if (node.type === 'menu') {
    const opts = (node.options || []).map((o, i) => `${o.match || (i + 1)}. ${o.label || ''}`).join('\n');
    return `${node.text || ''}\n${opts}`.trim();
  }
  return node.text || '';
}

// Resolve a menu reply to the next node id.
function resolveTransition(node, reply) {
  const r = String(reply || '').trim().toLowerCase();
  for (const o of (node.options || [])) {
    if (String(o.match).toLowerCase() === r || (o.label && o.label.toLowerCase() === r)) return o.next;
  }
  return null;
}

/**
 * Advance the bot for one inbound reply.
 * @param {Object} msg { phone, text }
 * @returns {Object} { active, messages:[], handoff?:bool }  active=false means no flow is handling it
 */
function step(msg = {}) {
  const phone = normPhone(msg.phone);
  const text = msg.text || '';
  if (!phone) return { active: false, messages: [] };
  const data = load();
  let session = getSession(data, phone);

  // start a flow if a trigger matches and no active session
  if (!session) {
    const flow = findTriggeredFlow(text);
    if (!flow) return { active: false, messages: [] };
    session = { phone, flowId: flow.id, nodeId: flow.startNodeId, data: {}, updatedAt: nowMs() };
    data.sessions[phone] = session;
  }

  const flow = data.flows.find(f => f.id === session.flowId);
  if (!flow) { delete data.sessions[phone]; save(data); return { active: false, messages: [] }; }

  const messages = [];
  let node = flow.nodes[session.nodeId];
  let guard = 0;

  // For a menu node we're sitting on, the incoming text is the choice.
  if (node && node.type === 'menu' && session._awaitingMenu) {
    const nextId = resolveTransition(node, text);
    if (!nextId) { messages.push(node.invalid || 'Sorry, please reply with one of the options.'); session.updatedAt = nowMs(); save(data); return { active: true, messages }; }
    session.nodeId = nextId; session._awaitingMenu = false;
    node = flow.nodes[nextId];
  } else if (node && node.type === 'input' && session._awaitingInput) {
    session.data[node.key || 'input'] = text;
    session.nodeId = node.next; session._awaitingInput = false;
    node = flow.nodes[node.next];
  }

  // walk forward through auto-advancing nodes until we need input or hit an end
  while (node && guard++ < 20) {
    if (node.type === 'message') {
      messages.push(renderNode(node));
      if (!node.next) { delete data.sessions[phone]; break; } // end
      session.nodeId = node.next; node = flow.nodes[node.next];
    } else if (node.type === 'menu') {
      messages.push(renderNode(node));
      session._awaitingMenu = true; break;
    } else if (node.type === 'input') {
      if (node.text) messages.push(node.text);
      session._awaitingInput = true; break;
    } else if (node.type === 'handoff') {
      if (node.text) messages.push(node.text);
      delete data.sessions[phone];
      session.updatedAt = nowMs(); save(data);
      return { active: true, messages, handoff: true, collected: session.data };
    } else break;
  }

  if (data.sessions[phone]) session.updatedAt = nowMs();
  save(data);
  return { active: true, messages };
}

function resetSession(phone) {
  const data = load();
  delete data.sessions[normPhone(phone)];
  save(data);
  return { reset: true };
}

module.exports = { createFlow, listFlows, getFlow, setActive, step, resetSession };
