'use strict';
/**
 * store.js — JSON persistence for the Marketplace Intelligence graph.
 *
 * Uses repository-relative data/ paths (gitignored). Never stores raw messages.
 * Env:
 *   MARKETPLACE_INTELLIGENCE_STORE_PATH    (default data/marketplace-intelligence.json)
 *   MARKETPLACE_INTELLIGENCE_HISTORY_PATH  (default data/marketplace-intelligence-history.json)
 *   MARKETPLACE_INTELLIGENCE_MAX_HISTORY   (default 2000)
 *   MARKETPLACE_INTELLIGENCE_STORE_RAW     (default false — must stay false)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
function rel(p) { return path.isAbsolute(p) ? p : path.join(ROOT, p); }

const STORE_PATH = rel(process.env.MARKETPLACE_INTELLIGENCE_STORE_PATH || 'data/marketplace-intelligence.json');
const HISTORY_PATH = rel(process.env.MARKETPLACE_INTELLIGENCE_HISTORY_PATH || 'data/marketplace-intelligence-history.json');
const MAX_HISTORY = Number(process.env.MARKETPLACE_INTELLIGENCE_MAX_HISTORY || 2000);

const EMPTY = () => ({
  version: 1,
  entities: {},      // id -> entity
  relationships: [], // {type, from, to, ts, confidence, metadataSafe}
  skus: [],          // {sku, label, normalizedLabel}
  updatedAt: null
});

function ensureDir(p) { try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch (_) {} }

function read() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch (_) { return EMPTY(); }
}

function write(state) {
  ensureDir(STORE_PATH);
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

function readHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')); }
  catch (_) { return []; }
}

function appendHistory(event) {
  const h = readHistory();
  h.push({ ts: new Date().toISOString(), ...event });
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
  ensureDir(HISTORY_PATH);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(h, null, 2), 'utf8');
  return event;
}

function reset() { return write(EMPTY()); }

module.exports = { read, write, readHistory, appendHistory, reset, EMPTY, STORE_PATH, HISTORY_PATH, MAX_HISTORY };
