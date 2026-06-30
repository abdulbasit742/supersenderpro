// lib/teamRouting/agentStore.js — Manage agents: skills, capacity, online status, working hours,
// and current load. Agents are deactivated, never hard-deleted. Load is the count of open
// assignments currently held (maintained by the router).

const store = require('./store');
const { config } = require('./config');

function publicView(a) {
 if (!a) return null;
 return { id: a.id, name: a.name, skills: a.skills || [], capacity: a.capacity, online: !!a.online, load: a.load || 0, active: a.active !== false, workingHours: a.workingHours || null, lastAssignedAt: a.lastAssignedAt || null };
}

function upsert({ id, name, skills, capacity, online, workingHours, active } = {}) {
 const d = store.load();
 const now = store.nowIso();
 let a = id ? d.agents.find((x) => x.id === id) : null;
 if (!a) {
 a = { id: id || store.genId('agt'), name: name || 'Agent', skills: [], capacity: config.defaultCapacity, online: false, load: 0, active: true, workingHours: null, lastAssignedAt: null, createdAt: now };
 d.agents.push(a);
 }
 if (name !== undefined) a.name = String(name);
 if (Array.isArray(skills)) a.skills = skills.map(String);
 if (capacity !== undefined) a.capacity = Number(capacity) > 0 ? Number(capacity) : a.capacity;
 if (online !== undefined) a.online = !!online;
 if (workingHours !== undefined) a.workingHours = workingHours; // { startHour, endHour } in local 24h
 if (active !== undefined) a.active = !!active;
 a.updatedAt = now;
 store.save(d);
 return publicView(a);
}

function all() { return store.load().agents.map(publicView); }
function get(id) { return publicView(store.load().agents.find((a) => a.id === id)); }
function setOnline(id, online) { return upsert({ id, online }); }
function _raw(d, id) { return d.agents.find((a) => a.id === id); }

// Adjust an agent's load (delta +1 on assign, -1 on close). Never below 0.
function adjustLoad(id, delta) {
 const d = store.load(); const a = _raw(d, id);
 if (!a) return null;
 a.load = Math.max(0, (a.load || 0) + delta);
 store.save(d);
 return publicView(a);
}

module.exports = { upsert, all, get, setOnline, adjustLoad, publicView, _raw };
