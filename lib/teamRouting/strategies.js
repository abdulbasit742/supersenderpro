// lib/teamRouting/strategies.js — Pure selection strategies over a candidate agent list. Each
// returns the chosen agent (raw record) or null. Candidates are pre-filtered by the router
// (active, online if required, has capacity, skill-matched when a skill is requested).

function _withinHours(agent, hour) {
 if (!agent.workingHours) return true;
 const { startHour: s, endHour: e } = agent.workingHours;
 if (s === undefined || e === undefined || s === e) return true;
 return s < e ? (hour >= s && hour < e) : (hour >= s || hour < e);
}

function leastLoad(candidates) {
 if (!candidates.length) return null;
 return candidates.slice().sort((a, b) => {
 const la = (a.load || 0) / (a.capacity || 1);
 const lb = (b.load || 0) / (b.capacity || 1);
 if (la !== lb) return la - lb; // lowest utilization first
 return (a.lastAssignedAt ? Date.parse(a.lastAssignedAt) : 0) - (b.lastAssignedAt ? Date.parse(b.lastAssignedAt) : 0);
 })[0];
}

function roundRobin(candidates, cursor) {
 if (!candidates.length) return null;
 // Order by id for stability, then pick the one after the cursor position.
 const ordered = candidates.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
 const idx = ((Number(cursor) || 0) % ordered.length + ordered.length) % ordered.length;
 return ordered[idx];
}

function skillMatch(candidates, skill) {
 if (!candidates.length) return null;
 const matching = skill ? candidates.filter((a) => (a.skills || []).includes(skill)) : candidates;
 // Among skill matches (or all if none match), pick least loaded.
 return leastLoad(matching.length ? matching : candidates);
}

module.exports = { leastLoad, roundRobin, skillMatch, _withinHours };
