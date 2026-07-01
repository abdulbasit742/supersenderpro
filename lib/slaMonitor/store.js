'use strict';
// Tenant-scoped, file-backed JSON store with mtime read-cache.
// Mirrors the repo's store.js conventions. No external deps.

const fs = require('fs');
const path = require('path');
const { config } = require('./config');

const _cache = new Map(); // key -> { mtimeMs, data }

function tenantDir(tenantId) {
  if (!tenantId) throw new Error('slaMonitor: tenantId is required');
  return path.join(config.dataDir, String(tenantId));
}

function filePath(tenantId, name) {
  return path.join(tenantDir(tenantId), name + '.json');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(tenantId, name, fallback) {
  const fp = filePath(tenantId, name);
  try {
    const st = fs.statSync(fp);
    const hit = _cache.get(fp);
    if (hit && hit.mtimeMs === st.mtimeMs) return hit.data;
    const raw = fs.readFileSync(fp, 'utf8');
    const data = raw ? JSON.parse(raw) : fallback;
    _cache.set(fp, { mtimeMs: st.mtimeMs, data });
    return data;
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw e;
  }
}

function write(tenantId, name, data) {
  const dir = tenantDir(tenantId);
  ensureDir(dir);
  const fp = filePath(tenantId, name);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
  try {
    const st = fs.statSync(fp);
    _cache.set(fp, { mtimeMs: st.mtimeMs, data });
  } catch (_) {}
  return data;
}

function listConversations(tenantId) {
  return read(tenantId, 'conversations', []);
}

function saveConversations(tenantId, rows) {
  return write(tenantId, 'conversations', rows);
}

module.exports = { read, write, listConversations, saveConversations, filePath, tenantDir };
