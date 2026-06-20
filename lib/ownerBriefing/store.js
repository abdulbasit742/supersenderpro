// lib/ownerBriefing/store.js — Safe JSON store + generic defensive readers for existing data.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return fallback;
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
// Read a data-dir file by relative name, never throwing.
function readDataFile(relName, fallback) {
  return readJSON(path.join(config.paths.dataDir, relName), fallback);
}
// Best-effort count of "records" in an arbitrary JSON shape.
function countRecords(data) {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === 'object') {
    for (const key of ['items', 'records', 'tasks', 'events', 'orders', 'customers', 'conversations']) {
      if (Array.isArray(data[key])) return data[key].length;
    }
    return Object.keys(data).length;
  }
  return 0;
}
module.exports = { readJSON, writeJSON, readDataFile, countRecords };
