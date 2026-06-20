// lib/securityGateway/suspiciousActivity.js — Lightweight in-memory recent-activity tracker keyed by hashed actor.
const recent = [];

function record(entry) {
  recent.push({ at: Date.now(), ...entry });
  if (recent.length > 1000) recent.splice(0, recent.length - 1000);
  return entry;
}
function list(limit = 50) { return recent.slice(-limit).reverse().map((r) => ({ ...r, at: new Date(r.at).toISOString() })); }
function countFor(keyHashed, sinceMs = 600000) { const cut = Date.now() - sinceMs; return recent.filter((r) => r.keyHashed === keyHashed && r.at >= cut).length; }
function clear() { recent.length = 0; }

module.exports = { record, list, countFor, clear };
