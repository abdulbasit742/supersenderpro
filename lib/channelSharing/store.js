'use strict';

/**
 * lib/channelSharing/store.js
 * Persistence for channel-to-channel sharing: routes (source -> targets),
 * per-route transforms, source blacklist, presets/settings, dedup ledger,
 * draft/approval queue, and delivery logs. Stored under data/channel_sharing.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'channel_sharing.json');

// Throttle presets (ms between sends). safe = slowest (anti-ban), max = fastest.
const PRESETS = { safe: 4000, fast: 1500, max: 500 };

const DEFAULTS = {
  settings: {
    enabled: true,
    preset: 'safe',
    draftMode: false, // when true, everything queues for manual approval
    branding: { enabled: true, footer: '' },
    scrub: { phones: true, links: true },
  },
  routes: [],
  blacklist: [],
  dedup: {},
  drafts: [],
  logs: [],
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify(DEFAULTS, null, 2));
}
function readAll() {
  ensureStore();
  try {
    const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}');
    return {
      ...DEFAULTS, ...d,
      settings: { ...DEFAULTS.settings, ...(d.settings || {}), branding: { ...DEFAULTS.settings.branding, ...((d.settings || {}).branding || {}) }, scrub: { ...DEFAULTS.settings.scrub, ...((d.settings || {}).scrub || {}) } },
      routes: Array.isArray(d.routes) ? d.routes : [],
      blacklist: Array.isArray(d.blacklist) ? d.blacklist : [],
      dedup: d.dedup || {},
      drafts: Array.isArray(d.drafts) ? d.drafts : [],
      logs: Array.isArray(d.logs) ? d.logs : [],
    };
  } catch { return JSON.parse(JSON.stringify(DEFAULTS)); }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function id(prefix) { return prefix + '_' + crypto.randomBytes(6).toString('hex'); }

// ---- settings ----
function getSettings() { return readAll().settings; }
function updateSettings(patch = {}) {
  const d = readAll();
  d.settings = {
    ...d.settings, ...patch,
    branding: { ...d.settings.branding, ...(patch.branding || {}) },
    scrub: { ...d.settings.scrub, ...(patch.scrub || {}) },
  };
  if (patch.preset && !PRESETS[patch.preset]) delete d.settings.preset, (d.settings.preset = 'safe');
  writeAll(d);
  return d.settings;
}
function throttleMs() {
  const s = readAll().settings;
  return PRESETS[s.preset] != null ? PRESETS[s.preset] : PRESETS.safe;
}

// ---- routes ----
function listRoutes() { return readAll().routes; }
function getRoute(rid) { return readAll().routes.find((r) => r.id === rid) || null; }
function createRoute(input = {}) {
  const d = readAll();
  const route = {
    id: id('route'),
    name: String(input.name || 'Untitled route').slice(0, 160),
    enabled: input.enabled !== false,
    sources: Array.isArray(input.sources) ? input.sources.map(String) : [],
    targets: Array.isArray(input.targets) ? input.targets.map((t) => ({ platform: t.platform, channelId: String(t.channelId) })) : [],
    transform: {
      scrubPhones: input.transform ? !!input.transform.scrubPhones : true,
      scrubLinks: input.transform ? !!input.transform.scrubLinks : true,
      findReplace: (input.transform && Array.isArray(input.transform.findReplace)) ? input.transform.findReplace : [],
      branding: { enabled: input.transform && input.transform.branding ? !!input.transform.branding.enabled : false, footer: (input.transform && input.transform.branding && input.transform.branding.footer) || '' },
      minLen: (input.transform && input.transform.minLen) || 0,
      blockKeywords: (input.transform && Array.isArray(input.transform.blockKeywords)) ? input.transform.blockKeywords : [],
    },
    draft: !!input.draft,
    createdAt: new Date().toISOString(),
  };
  d.routes.push(route);
  writeAll(d);
  return route;
}
function updateRoute(rid, patch = {}) {
  const d = readAll();
  const i = d.routes.findIndex((r) => r.id === rid);
  if (i === -1) return null;
  d.routes[i] = { ...d.routes[i], ...patch, transform: { ...d.routes[i].transform, ...(patch.transform || {}) } };
  writeAll(d);
  return d.routes[i];
}
function deleteRoute(rid) {
  const d = readAll();
  const n = d.routes.length;
  d.routes = d.routes.filter((r) => r.id !== rid);
  writeAll(d);
  return d.routes.length < n;
}

// ---- blacklist ----
function getBlacklist() { return readAll().blacklist; }
function setBlacklist(list) { const d = readAll(); d.blacklist = (list || []).map(String); writeAll(d); return d.blacklist; }

// ---- dedup ----
function isDuplicate(key) { return !!readAll().dedup[key]; }
function markSeen(key) { const d = readAll(); d.dedup[key] = Date.now(); writeAll(d); }

// ---- drafts ----
function listDrafts() { return readAll().drafts; }
function addDraft(draft) {
  const d = readAll();
  const item = { id: id('draft'), status: 'pending', createdAt: new Date().toISOString(), ...draft };
  d.drafts.push(item);
  writeAll(d);
  return item;
}
function updateDraft(did, patch) {
  const d = readAll();
  const i = d.drafts.findIndex((x) => x.id === did);
  if (i === -1) return null;
  d.drafts[i] = { ...d.drafts[i], ...patch };
  writeAll(d);
  return d.drafts[i];
}
function removeDraft(did) { const d = readAll(); d.drafts = d.drafts.filter((x) => x.id !== did); writeAll(d); }

// ---- logs ----
function addLog(entry) {
  const d = readAll();
  d.logs.unshift({ id: id('log'), at: new Date().toISOString(), ...entry });
  d.logs = d.logs.slice(0, 500); // cap
  writeAll(d);
}
function listLogs(limit = 100) { return readAll().logs.slice(0, limit); }

module.exports = {
  STORE_FILE, PRESETS,
  getSettings, updateSettings, throttleMs,
  listRoutes, getRoute, createRoute, updateRoute, deleteRoute,
  getBlacklist, setBlacklist,
  isDuplicate, markSeen,
  listDrafts, addDraft, updateDraft, removeDraft,
  addLog, listLogs,
};
