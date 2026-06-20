// lib/saasBilling/store.js — Safe atomic JSON store for the SaaS Billing layer.
// Never throws on read. Writes atomically via tmp+rename. Creates the data dir on demand.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw || !raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (_e) { return fallback; }
}

function writeJSON(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch (_e) { return false; }
}

// Best-effort count of records in arbitrary JSON shapes from existing modules.
function countRecords(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'object') {
    for (const key of ['items', 'records', 'users', 'resellers', 'orders', 'customers', 'invoices', 'licenses']) {
      if (Array.isArray(data[key])) return data[key].length;
    }
    return Object.keys(data).length;
  }
  return 0;
}

// Read any file in the repo data dir defensively (used to inspect existing modules).
function readDataFile(relName, fallback) {
  return readJSON(path.join(config.paths.dataDir, relName), fallback);
}

function nowIso() { return new Date().toISOString(); }
function genId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

module.exports = { readJSON, writeJSON, countRecords, readDataFile, nowIso, genId };
