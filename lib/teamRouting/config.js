// lib/teamRouting/config.js — Safe config for the Team Inbox Routing & Assignment department.
// JSON-backed like the rest of the app. This module DECIDES who should handle a conversation; it
// never sends. Defaults are conservative (capacity-aware, online-only). Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.TEAM_ROUTING_ENABLED, true),
 // Default assignment strategy: 'round_robin' | 'least_load' | 'skill_match'.
 defaultStrategy: process.env.TEAM_ROUTING_DEFAULT_STRATEGY || 'least_load',
 // Default per-agent max concurrent open conversations (overridable per agent).
 defaultCapacity: num(process.env.TEAM_ROUTING_DEFAULT_CAPACITY, 8),
 // Only assign to agents marked online (else fall back to any agent if none online).
 requireOnline: bool(process.env.TEAM_ROUTING_REQUIRE_ONLINE, true),
 // If no agent can take it, hold in an unassigned queue (true) vs force-assign least loaded (false).
 queueWhenFull: bool(process.env.TEAM_ROUTING_QUEUE_WHEN_FULL, true),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.TEAM_ROUTING_STORE_PATH, 'data/team-routing.json'),
 },
};

const STRATEGIES = ['round_robin', 'least_load', 'skill_match'];

module.exports = { config, bool, num, ROOT, DATA_DIR, STRATEGIES };
