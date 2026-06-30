'use strict';
// Tenant-scoped, file-backed JSON store with mtime read-cache. No deps.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'data', 'churnPredictor');
const _cache = new Map(); // tenantId -> { mtimeMs, data }

function tenantFile(tenantId) {
  if (!tenantId) throw new Error('churnPredictor: tenantId is required');
  return path.join(ROOT, String(tenantId) + '.json');
}

function _read(tenantId) {
  const file = tenantFile(tenantId);
  let stat;
  try { stat = fs.statSync(file); } catch { return { contacts: {}, flags: {} }; }
  const hit = _cache.get(tenantId);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  _cache.set(tenantId, { mtimeMs: stat.mtimeMs, data });
  return data;
}

function _write(tenantId, data) {
  const file = tenantFile(tenantId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  try { _cache.set(tenantId, { mtimeMs: fs.statSync(file).mtimeMs, data }); } catch {}
}

function getContacts(tenantId) {
  const d = _read(tenantId);
  return d.contacts || {};
}

function upsertContacts(tenantId, contacts) {
  if (!tenantId) throw new Error('churnPredictor: tenantId is required');
  const d = _read(tenantId);
  d.contacts = d.contacts || {};
  for (const c of contacts || []) {
    if (!c || !c.phone) continue;
    d.contacts[c.phone] = { ...(d.contacts[c.phone] || {}), ...c };
  }
  _write(tenantId, d);
  return Object.keys(d.contacts).length;
}

function saveFlags(tenantId, flags) {
  if (!tenantId) throw new Error('churnPredictor: tenantId is required');
  const d = _read(tenantId);
  d.flags = flags;
  d.flagsUpdatedAt = new Date().toISOString();
  _write(tenantId, d);
}

module.exports = { getContacts, upsertContacts, saveFlags };
