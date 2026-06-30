'use strict';
/**
 * lib/interactiveTemplates/store.js - tenant-scoped JSON persistence with an mtime read cache.
 * Mirrors the repo convention (fs+JSON) while avoiding per-request disk reads.
 */
const fs = require('fs');
const { paths } = require('./config');

if (!fs.existsSync(paths.dir)) fs.mkdirSync(paths.dir, { recursive: true });

const cache = new Map();
const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      cache.set(file, { data: clone(fallback), mtimeMs: fs.statSync(file).mtimeMs });
      return clone(fallback);
    }
    const { mtimeMs } = fs.statSync(file);
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === mtimeMs) return clone(hit.data);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache.set(file, { data: clone(data), mtimeMs });
    return clone(data);
  } catch {
    return clone(fallback);
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  try { cache.set(file, { data: clone(data), mtimeMs: fs.statSync(file).mtimeMs }); } catch {}
  return data;
}

module.exports = { readJSON, writeJSON };
