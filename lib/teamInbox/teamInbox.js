// lib/teamInbox/teamInbox.js
// ────────────────────────────────────────────────────────────────────
// Shared Team Inbox + Smart Assignment. Once you have more than one human agent,
// escalated chats need to be routed, owned, and answered in time — without two
// agents replying to the same customer. This adds:
//   - agent registry + presence (online/away) and skills,
//   - smart assignment: by skill (from intent routing #17), least-busy load
//     balancing, or round-robin,
//   - a collision lock: one active assignee per conversation (claim/release),
//   - SLA timers: first-response + resolution, with breach detection,
//   - AI-phrased internal handoff notes (the model only writes the note).
//
// Assignment + SLA are deterministic; file-backed. Pairs with the support
// agent\'s escalation (#1), intent router (#17), and customer 360 (#48).
// Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[teamInbox] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.TEAM_INBOX_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'team_inbox');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const agentsFile = (storeId) => path.join(DATA_DIR, `${storeId}_agents.json`);
const convFile = (storeId) => path.join(DATA_DIR, `${storeId}_conversations.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[teamInbox] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  strategy: 'skill_then_load',   // skill_then_load | least_busy | round_robin
  firstResponseSlaMins: 15,
  resolutionSlaMins: 240,
  maxOpenPerAgent: 10
};
function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG }); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; writeJSON(configFile(storeId), m); return m; }

function readAgents(storeId) { return readJSON(agentsFile(storeId), {}); }
function writeAgents(storeId, d) { writeJSON(agentsFile(storeId), d); }
function readConv(storeId) { return readJSON(convFile(storeId), {}); }
function writeConv(storeId, d) { writeJSON(convFile(storeId), d); }

// ── Agents ───────────────────────────────────────────────────
function upsertAgent({ storeId = 'default_store', id, name, skills = [], status = 'online' } = {}) {
  if (!id) throw new Error('agent id is required');
  const agents = readAgents(storeId);
  const a = agents[id] || { id, openCount: 0, lastAssignedAt: 0, totalAssigned: 0 };
  a.name = name || a.name || id;
  a.skills = Array.isArray(skills) && skills.length ? skills.map(s => String(s).toLowerCase()) : (a.skills || []);
  a.status = status;
  agents[id] = a; writeAgents(storeId, agents);
  return a;
}
function setPresence({ storeId = 'default_store', id, status } = {}) {
  const agents = readAgents(storeId); if (!agents[id]) throw new Error('unknown agent'); agents[id].status = status; writeAgents(storeId, agents); return agents[id];
}
function listAgents({ storeId = 'default_store' } = {}) { return Object.values(readAgents(storeId)); }

// ── Assignment (deterministic) ───────────────────────────────────
function eligibleAgents(agents, cfg, skill) {
  let pool = Object.values(agents).filter(a => a.status === 'online' && (a.openCount || 0) < cfg.maxOpenPerAgent);
  if (skill) { const skilled = pool.filter(a => (a.skills || []).includes(String(skill).toLowerCase())); if (skilled.length) pool = skilled; }
  return pool;
}
function pickAgent(pool, strategy) {
  if (!pool.length) return null;
  if (strategy === 'round_robin') return pool.slice().sort((a, b) => (a.lastAssignedAt || 0) - (b.lastAssignedAt || 0))[0];
  // least_busy (and skill_then_load fallthrough): fewest open, then oldest assigned
  return pool.slice().sort((a, b) => (a.openCount || 0) - (b.openCount || 0) || (a.lastAssignedAt || 0) - (b.lastAssignedAt || 0))[0];
}

/**
 * Assign (or route) a conversation. Idempotent: if already actively assigned,
 * returns the current assignee (no stealing). skill usually comes from the
 * intent router (#17) routing.team.
 * @returns {{ ok, assignee, conversation, reason }}
 */
function assign({ storeId = 'default_store', phone, skill, priority = 'normal' } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const conv = readConv(storeId);
  const c = conv[phone] || { phone, status: 'queued', priority, createdAt: Date.now(), firstResponseAt: null, slaFirstBy: Date.now() + cfg.firstResponseSlaMins * 60000, slaResolveBy: Date.now() + cfg.resolutionSlaMins * 60000, history: [] };
  c.priority = priority;
  if (c.assignee && c.status === 'assigned') { conv[phone] = c; writeConv(storeId, conv); return { ok: true, assignee: c.assignee, conversation: c, reason: 'already assigned' }; }

  const agents = readAgents(storeId);
  const strategy = cfg.strategy === 'round_robin' ? 'round_robin' : (cfg.strategy === 'least_busy' ? 'least_busy' : 'skill_then_load');
  const pool = eligibleAgents(agents, cfg, strategy === 'skill_then_load' ? skill : null);
  const chosen = pickAgent(pool, strategy);
  if (!chosen) { c.status = 'queued'; c.skill = skill || c.skill || null; conv[phone] = c; writeConv(storeId, conv); return { ok: false, reason: 'no available agent', conversation: c }; }

  chosen.openCount = (chosen.openCount || 0) + 1; chosen.lastAssignedAt = Date.now(); chosen.totalAssigned = (chosen.totalAssigned || 0) + 1;
  agents[chosen.id] = chosen; writeAgents(storeId, agents);
  c.assignee = chosen.id; c.status = 'assigned'; c.skill = skill || c.skill || null; c.assignedAt = Date.now();
  c.history.push({ event: 'assigned', agent: chosen.id, ts: Date.now() });
  conv[phone] = c; writeConv(storeId, conv);
  return { ok: true, assignee: chosen.id, conversation: c, reason: 'assigned' };
}

/**
 * Claim a conversation for a specific agent (collision lock). Fails if someone
 * else already holds it (active assignment).
 */
function claim({ storeId = 'default_store', phone, agentId } = {}) {
  if (!phone || !agentId) throw new Error('phone and agentId are required');
  const conv = readConv(storeId); const agents = readAgents(storeId);
  if (!agents[agentId]) throw new Error('unknown agent');
  const c = conv[phone] || { phone, status: 'queued', createdAt: Date.now(), history: [] };
  if (c.assignee && c.assignee !== agentId && c.status === 'assigned') return { ok: false, error: 'conversation already claimed', heldBy: c.assignee };
  // release from previous (if reassigning to same agent this is a no-op)
  if (c.assignee && c.assignee !== agentId) adjustOpen(agents, c.assignee, -1);
  if (c.assignee !== agentId) adjustOpen(agents, agentId, +1);
  c.assignee = agentId; c.status = 'assigned'; c.assignedAt = c.assignedAt || Date.now();
  c.history.push({ event: 'claimed', agent: agentId, ts: Date.now() });
  conv[phone] = c; writeAgents(storeId, agents); writeConv(storeId, conv);
  return { ok: true, assignee: agentId, conversation: c };
}

function adjustOpen(agents, agentId, delta) { if (agents[agentId]) agents[agentId].openCount = Math.max(0, (agents[agentId].openCount || 0) + delta); }

/** Record the agent\'s first response (stops the first-response SLA). */
function recordFirstResponse({ storeId = 'default_store', phone } = {}) {
  const conv = readConv(storeId); const c = conv[phone]; if (!c) return { ok: false, error: 'no conversation' };
  if (!c.firstResponseAt) { c.firstResponseAt = Date.now(); c.history.push({ event: 'first_response', ts: Date.now() }); conv[phone] = c; writeConv(storeId, conv); }
  return { ok: true, firstResponseAt: c.firstResponseAt };
}

/** Release / resolve a conversation (frees the agent\'s slot). */
function resolve({ storeId = 'default_store', phone } = {}) {
  const conv = readConv(storeId); const agents = readAgents(storeId); const c = conv[phone];
  if (!c) return { ok: false, error: 'no conversation' };
  if (c.assignee) adjustOpen(agents, c.assignee, -1);
  c.status = 'resolved'; c.resolvedAt = Date.now(); c.history.push({ event: 'resolved', ts: Date.now() });
  conv[phone] = c; writeAgents(storeId, agents); writeConv(storeId, conv);
  return { ok: true, status: 'resolved' };
}
function release({ storeId = 'default_store', phone } = {}) {
  const conv = readConv(storeId); const agents = readAgents(storeId); const c = conv[phone];
  if (!c) return { ok: false, error: 'no conversation' };
  if (c.assignee) adjustOpen(agents, c.assignee, -1);
  c.assignee = null; c.status = 'queued'; c.history.push({ event: 'released', ts: Date.now() });
  conv[phone] = c; writeAgents(storeId, agents); writeConv(storeId, conv);
  return { ok: true, status: 'queued' };
}

// ── SLA ────────────────────────────────────────────────────
function slaBreaches({ storeId = 'default_store', now = Date.now() } = {}) {
  const conv = readConv(storeId);
  const out = [];
  for (const phone of Object.keys(conv)) {
    const c = conv[phone];
    if (c.status === 'resolved') continue;
    if (!c.firstResponseAt && c.slaFirstBy && now > c.slaFirstBy) out.push({ phone, type: 'first_response', overdueMins: Math.round((now - c.slaFirstBy) / 60000), assignee: c.assignee || null });
    if (c.status !== 'resolved' && c.slaResolveBy && now > c.slaResolveBy) out.push({ phone, type: 'resolution', overdueMins: Math.round((now - c.slaResolveBy) / 60000), assignee: c.assignee || null });
  }
  return out.sort((a, b) => b.overdueMins - a.overdueMins);
}

function queue({ storeId = 'default_store', status, assignee } = {}) {
  let list = Object.values(readConv(storeId)).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (status) list = list.filter(c => c.status === status);
  if (assignee) list = list.filter(c => c.assignee === assignee);
  return list;
}

// ── AI handoff note ────────────────────────────────────────
async function handoffNote({ storeId = 'default_store', phone, context } = {}) {
  const c = readConv(storeId)[phone];
  const base = `Handoff: ${phone}${c && c.skill ? ` (${c.skill})` : ''}${c && c.priority ? ` [${c.priority}]` : ''}. ${context || ''}`.trim();
  if (!processPrompt) return { note: base, source: 'fallback' };
  const prompt = ['Write a ONE-line internal handoff note for an agent picking up a chat.', `Context: ${context || 'escalated conversation'}. Phone: ${phone}.`, 'Concise, factual, no fluff. Return ONLY the note.'].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { note: base, source: 'fallback' };
    return { note: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch { return { note: base, source: 'fallback' }; }
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = {
  upsertAgent, setPresence, listAgents, assign, claim, recordFirstResponse, resolve, release,
  slaBreaches, queue, handoffNote, getConfig, setConfig, health,
  _internal: { eligibleAgents, pickAgent, DEFAULT_CONFIG }
};
