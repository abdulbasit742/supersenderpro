// lib/chatbotFlow/flowBuilder.js
// Feature #92 - Visual Chatbot Flow Builder
// Deterministic flow engine. Define node-based flows and run a contact
// through them step-by-step, advancing on each inbound reply.
// AI (Ollama via ai/aiBrain) is OPTIONAL and only used to rephrase
// outgoing message text when enabled; the core runs with no model.
// File-backed storage under data/. Zero new npm dependencies.

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'chatbotFlow');
const FLOWS_FILE = path.join(DATA_DIR, 'flows.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

const NODE_TYPES = ['message', 'question', 'condition', 'action', 'end'];

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function loadFlows() { return readJson(FLOWS_FILE, {}); }
function saveFlows(f) { writeJson(FLOWS_FILE, f); }
function loadSessions() { return readJson(SESSIONS_FILE, {}); }
function saveSessions(s) { writeJson(SESSIONS_FILE, s); }

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function requireTenant(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  return String(tenantId);
}

// ---- Flow definition -------------------------------------------------------
// A flow is { id, tenantId, name, startNode, nodes: { [id]: node } }
// node = { id, type, text?, field?, options?, next?, branches?, action? }
//  - message:   { text, next }
//  - question:  { text, field, next }  (saves reply into vars[field])
//  - condition: { field, branches: [{ equals, next }], next (default) }
//  - action:    { action: 'tag'|'handoff'|'noop', value?, next }
//  - end:       terminal

function validateFlow(def) {
  if (!def || typeof def !== 'object') throw new Error('flow definition required');
  if (!def.name) throw new Error('flow.name required');
  const nodes = def.nodes || {};
  const ids = Object.keys(nodes);
  if (!ids.length) throw new Error('flow must have at least one node');
  const start = def.startNode || ids[0];
  if (!nodes[start]) throw new Error('startNode not found in nodes');
  for (const id of ids) {
    const n = nodes[id];
    n.id = id;
    if (!NODE_TYPES.includes(n.type)) {
      throw new Error('invalid node type "' + n.type + '" on node ' + id);
    }
  }
  return start;
}

function defineFlow(tenantId, def) {
  const t = requireTenant(tenantId);
  const start = validateFlow(def);
  const flows = loadFlows();
  const id = def.id || genId('flow');
  flows[id] = {
    id,
    tenantId: t,
    name: def.name,
    startNode: start,
    nodes: def.nodes,
    updatedAt: new Date().toISOString()
  };
  saveFlows(flows);
  return flows[id];
}

function listFlows(tenantId) {
  const t = requireTenant(tenantId);
  return Object.values(loadFlows()).filter(f => f.tenantId === t);
}

function getFlow(tenantId, flowId) {
  const t = requireTenant(tenantId);
  const f = loadFlows()[flowId];
  if (!f || f.tenantId !== t) return null;
  return f;
}

function deleteFlow(tenantId, flowId) {
  const t = requireTenant(tenantId);
  const flows = loadFlows();
  if (flows[flowId] && flows[flowId].tenantId === t) {
    delete flows[flowId];
    saveFlows(flows);
    return true;
  }
  return false;
}

// ---- Runtime ---------------------------------------------------------------

function sessionKey(tenantId, flowId, contact) {
  return tenantId + '::' + flowId + '::' + contact;
}

// Optional AI phrasing. Never throws; falls back to raw text.
async function maybeRephrase(text, opts) {
  if (!opts || !opts.aiPhrasing) return text;
  try {
    const brain = require(path.join(process.cwd(), 'ai', 'aiBrain.js'));
    const fn = brain.processPrompt || brain.process || brain.default;
    if (typeof fn !== 'function') return text;
    const out = await fn({
      system: 'Rephrase the message to be warm and concise. Keep meaning identical. Reply with only the message.',
      prompt: text
    });
    const s = typeof out === 'string' ? out : (out && (out.text || out.content));
    return (s && String(s).trim()) || text;
  } catch (_) {
    return text;
  }
}

// Walk forward emitting outgoing messages until we hit a node that needs
// user input (question) or terminates (end).
async function walk(flow, session, opts) {
  const emitted = [];
  let guard = 0;
  while (guard++ < 100) {
    const node = flow.nodes[session.currentNode];
    if (!node) { session.done = true; break; }
    if (node.type === 'message') {
      emitted.push(await maybeRephrase(node.text || '', opts));
      session.currentNode = node.next;
      if (!session.currentNode) { session.done = true; break; }
      continue;
    }
    if (node.type === 'action') {
      if (node.action === 'handoff') { session.handoff = true; }
      if (node.action === 'tag' && node.value) {
        session.tags = session.tags || [];
        if (!session.tags.includes(node.value)) session.tags.push(node.value);
      }
      session.currentNode = node.next;
      if (!session.currentNode) { session.done = true; break; }
      continue;
    }
    if (node.type === 'condition') {
      const val = (session.vars || {})[node.field];
      let nxt = node.next;
      for (const b of (node.branches || [])) {
        if (String(b.equals).toLowerCase() === String(val).toLowerCase()) { nxt = b.next; break; }
      }
      session.currentNode = nxt;
      if (!session.currentNode) { session.done = true; break; }
      continue;
    }
    if (node.type === 'question') {
      emitted.push(await maybeRephrase(node.text || '', opts));
      session.awaiting = node.id;
      break;
    }
    if (node.type === 'end') {
      if (node.text) emitted.push(await maybeRephrase(node.text, opts));
      session.done = true;
      break;
    }
    session.done = true;
    break;
  }
  return emitted;
}

// Start or advance a contact through a flow.
// reply = the inbound text from the contact (undefined to start).
async function run(tenantId, flowId, contact, reply, opts) {
  const t = requireTenant(tenantId);
  if (!contact) throw new Error('contact is required');
  const flow = getFlow(t, flowId);
  if (!flow) throw new Error('flow not found');

  const sessions = loadSessions();
  const key = sessionKey(t, flowId, contact);
  let session = sessions[key];

  if (!session) {
    session = { tenantId: t, flowId, contact, currentNode: flow.startNode, vars: {}, done: false };
  }

  // If we were awaiting an answer, capture it into the question's field.
  if (session.awaiting && typeof reply === 'string') {
    const qnode = flow.nodes[session.awaiting];
    if (qnode && qnode.field) {
      session.vars[qnode.field] = reply;
    }
    session.currentNode = qnode ? qnode.next : session.currentNode;
    session.awaiting = null;
    if (!session.currentNode) session.done = true;
  }

  const messages = session.done ? [] : await walk(flow, session, opts);
  session.updatedAt = new Date().toISOString();
  sessions[key] = session;
  saveSessions(sessions);

  return {
    flowId,
    contact,
    messages,
    awaiting: session.awaiting || null,
    done: !!session.done,
    handoff: !!session.handoff,
    tags: session.tags || [],
    vars: session.vars || {}
  };
}

function resetSession(tenantId, flowId, contact) {
  const t = requireTenant(tenantId);
  const sessions = loadSessions();
  const key = sessionKey(t, flowId, contact);
  if (sessions[key]) { delete sessions[key]; saveSessions(sessions); return true; }
  return false;
}

function health() {
  let flows = 0, sessions = 0;
  try { flows = Object.keys(loadFlows()).length; } catch (_) {}
  try { sessions = Object.keys(loadSessions()).length; } catch (_) {}
  return { ok: true, feature: 'chatbotFlow', flows, sessions, nodeTypes: NODE_TYPES };
}

module.exports = {
  NODE_TYPES,
  defineFlow,
  listFlows,
  getFlow,
  deleteFlow,
  run,
  resetSession,
  health
};
