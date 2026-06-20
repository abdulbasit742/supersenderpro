// lib/securityGateway/store.js — Memory-first safe store with optional file persistence.
// Persistence targets are gitignored (data/security-*.json). Defaults to in-memory so tests never write secrets/raw data.
const fs = require('fs');
const path = require('path');

function readJSON(file, fallback) { try { if (!fs.existsSync(file)) return fallback; const r = fs.readFileSync(file, 'utf8'); if (!r.trim()) return fallback; return JSON.parse(r); } catch (_e) { return fallback; } }
function writeJSON(file, data) { try { const d = path.dirname(file); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); const t = `${file}.tmp`; fs.writeFileSync(t, JSON.stringify(data, null, 2)); fs.renameSync(t, file); return true; } catch (_e) { return false; } }

// In-memory collections (policies, events). File persistence is opt-in and best-effort.
const mem = { policies: [], events: [] };

const Store = {
  listPolicies() { return mem.policies.slice(); },
  getPolicy(id) { return mem.policies.find((p) => p.id === id) || null; },
  upsertPolicy(p) { const i = mem.policies.findIndex((x) => x.id === p.id); if (i >= 0) mem.policies[i] = p; else mem.policies.push(p); return p; },
  listEvents(limit = 200) { return mem.events.slice(-limit).reverse(); },
  getEvent(id) { return mem.events.find((e) => e.id === id) || null; },
  addEvent(e) { mem.events.push(e); if (mem.events.length > 5000) mem.events.splice(0, mem.events.length - 5000); return e; },
  reset() { mem.policies = []; mem.events = []; },
  _mem: mem,
};

module.exports = { readJSON, writeJSON, Store };
