// lib/teamRouting/router.js — The core. assign(conversationId, { skill, strategy }) picks an agent
// per the chosen strategy from eligible candidates (active, online if required, within working
// hours, with spare capacity, skill-matched when a skill is requested), records the assignment,
// bumps the agent's load, and advances the round-robin cursor. release() frees an assignment and
// decrements load. reassign() moves a conversation (e.g. agent went offline / overloaded).
//
// If nobody is eligible: queue it (default) or force the least-loaded agent (config.queueWhenFull=false).

const store = require('./store');
const { config, STRATEGIES } = require('./config');
const agentStore = require('./agentStore');
const strategies = require('./strategies');

let consentLib = null; try { consentLib = require('../consentCenter'); } catch (_e) { consentLib = null; }

function _eligible(d, { skill, refNow }) {
 const hour = new Date(refNow).getHours();
 return d.agents.filter((a) => {
 if (a.active === false) return false;
 if (config.requireOnline && !a.online) return false;
 if (!strategies._withinHours(a, hour)) return false;
 if ((a.load || 0) >= (a.capacity || config.defaultCapacity)) return false;
 if (skill && !(a.skills || []).includes(skill)) return false;
 return true;
 });
}

function assign(conversationId, { skill = null, strategy, refNow = Date.now() } = {}) {
 if (!conversationId) throw new Error('conversationId is required');
 if (!config.enabled) return { assigned: false, reason: 'routing disabled' };
 const strat = STRATEGIES.includes(strategy) ? strategy : config.defaultStrategy;
 const d = store.load();

 // Already assigned + still open? keep it sticky.
 if (d.assignments[conversationId]) return { assigned: true, sticky: true, agentId: d.assignments[conversationId].agentId, conversationId };

 let candidates = _eligible(d, { skill, refNow });
 // Skill strategy may relax to any-eligible if no skill match; others require the eligible set.
 let agent = null;
 if (candidates.length) {
 if (strat === 'round_robin') { agent = strategies.roundRobin(candidates, d.rrCursor); d.rrCursor = (d.rrCursor + 1) % Math.max(1, candidates.length); }
 else if (strat === 'skill_match') agent = strategies.skillMatch(candidates, skill);
 else agent = strategies.leastLoad(candidates);
 }

 if (!agent) {
 // Nobody eligible (all full/offline/out-of-hours).
 if (config.queueWhenFull) {
 if (!d.queue.find((q) => q.conversationId === conversationId)) d.queue.push({ conversationId, skill, at: store.nowIso() });
 store.save(d);
 return { assigned: false, queued: true, reason: 'no eligible agent', conversationId };
 }
 // Force least-loaded active agent regardless of capacity/online.
 const fallback = strategies.leastLoad(d.agents.filter((a) => a.active !== false));
 if (!fallback) { store.save(d); return { assigned: false, reason: 'no agents exist', conversationId }; }
 agent = fallback;
 }

 d.assignments[conversationId] = { agentId: agent.id, at: store.nowIso(), skill };
 const raw = d.agents.find((a) => a.id === agent.id);
 if (raw) { raw.load = (raw.load || 0) + 1; raw.lastAssignedAt = store.nowIso(); }
 // Remove from queue if it was queued.
 d.queue = d.queue.filter((q) => q.conversationId !== conversationId);
 store.save(d);
 return { assigned: true, agentId: agent.id, agentName: agent.name, strategy: strat, skill, conversationId };
}

function release(conversationId) {
 const d = store.load();
 const a = d.assignments[conversationId];
 if (!a) return { released: false, reason: 'not assigned' };
 const raw = d.agents.find((x) => x.id === a.agentId);
 if (raw) raw.load = Math.max(0, (raw.load || 0) - 1);
 delete d.assignments[conversationId];
 store.save(d);
 // Try to drain the queue onto the freed capacity.
 _drainQueue();
 return { released: true, freedAgentId: a.agentId, conversationId };
}

function reassign(conversationId, { skill, strategy } = {}) {
 const d = store.load();
 const cur = d.assignments[conversationId];
 if (cur) { const raw = d.agents.find((x) => x.id === cur.agentId); if (raw) raw.load = Math.max(0, (raw.load || 0) - 1); delete d.assignments[conversationId]; store.save(d); }
 return assign(conversationId, { skill, strategy });
}

// When an agent goes offline, move their open conversations back to the pool.
function reassignAgentConversations(agentId, { strategy } = {}) {
 const d = store.load();
 const convos = Object.entries(d.assignments).filter(([, v]) => v.agentId === agentId).map(([k, v]) => ({ conversationId: k, skill: v.skill }));
 const results = [];
 for (const c of convos) results.push(reassign(c.conversationId, { skill: c.skill, strategy }));
 return { moved: results.filter((r) => r.assigned).length, queued: results.filter((r) => r.queued).length, results };
}

function _drainQueue() {
 const d = store.load();
 if (!d.queue.length) return;
 const pending = d.queue.slice();
 for (const q of pending) {
 const r = assign(q.conversationId, { skill: q.skill });
 if (!r.assigned) break; // still no capacity; stop draining
 }
}

function assignmentFor(conversationId) { const a = store.load().assignments[conversationId]; return a ? { conversationId, agentId: a.agentId, at: a.at, skill: a.skill } : null; }
function queue() { return store.load().queue.slice(); }

function overview() {
 const d = store.load();
 const agents = d.agents;
 return {
 generatedAt: store.nowIso(),
 strategy: config.defaultStrategy,
 cards: {
 agents: agents.length,
 online: agents.filter((a) => a.online).length,
 openAssignments: Object.keys(d.assignments).length,
 queued: d.queue.length,
 totalCapacity: agents.filter((a) => a.active !== false).reduce((s, a) => s + (a.capacity || 0), 0),
 totalLoad: agents.reduce((s, a) => s + (a.load || 0), 0),
 },
 agents: agents.map(agentStore.publicView),
 };
}

module.exports = { assign, release, reassign, reassignAgentConversations, assignmentFor, queue, overview };
