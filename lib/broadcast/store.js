// lib/broadcast/store.js — atomic JSON store for broadcast campaigns
// Tenant-scoped. Every record carries tenantId; reads/writes that omit it throw.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('./config');

const ROOT = process.cwd();
const DIR = path.join(ROOT, config.dataDir);
const FILE = path.join(DIR, 'campaigns.json');

function ensureDir() { try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {} }

function readAll() {
  ensureDir();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

// Atomic write via tmp file + rename (crash-safe).
function writeAll(rows) {
  ensureDir();
  const tmp = path.join(DIR, `.campaigns.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, FILE);
  return rows;
}

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('broadcast.store: tenantId is required');
  }
  return tenantId;
}

function newId() { return 'bc_' + crypto.randomBytes(8).toString('hex'); }

function list(tenantId) {
  requireTenant(tenantId);
  return readAll().filter(r => r.tenantId === tenantId);
}

function get(tenantId, id) {
  requireTenant(tenantId);
  return readAll().find(r => r.tenantId === tenantId && r.id === id) || null;
}

function insert(tenantId, rec) {
  requireTenant(tenantId);
  const rows = readAll();
  const row = { id: newId(), tenantId, createdAt: new Date().toISOString(), ...rec };
  rows.push(row);
  writeAll(rows);
  return row;
}

function update(tenantId, id, patch) {
  requireTenant(tenantId);
  const rows = readAll();
  const i = rows.findIndex(r => r.tenantId === tenantId && r.id === id);
  if (i === -1) return null;
  rows[i] = { ...rows[i], ...patch, updatedAt: new Date().toISOString() };
  writeAll(rows);
  return rows[i];
}

module.exports = { list, get, insert, update, newId, _file: FILE };
