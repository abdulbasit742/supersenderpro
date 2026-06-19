'use strict';

/**
 * lib/ecommerceStore.js — persistence for e-commerce connections + cached
 * products/orders. Stored under data/ecommerce_connections.json.
 *
 * NOTE: credentials are stored as provided. In production wrap these with the
 * project's existing ENCRYPTION_KEY at rest; this store keeps the same shape so
 * encryption can be layered in without API changes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'ecommerce_connections.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ connections: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try { const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}'); if (!Array.isArray(d.connections)) d.connections = []; return d; }
  catch { return { connections: [] }; }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function newId() { return 'conn_' + crypto.randomBytes(6).toString('hex'); }

/** Public-safe view of a connection (no raw credentials). */
function redact(c) {
  if (!c) return c;
  const { credentials, ...rest } = c;
  return { ...rest, hasCredentials: !!credentials && Object.keys(credentials).length > 0 };
}

function createConnection(input = {}) {
  const d = readAll();
  const now = new Date().toISOString();
  const c = {
    id: newId(),
    platform: input.platform,
    label: input.label || input.platform,
    credentials: input.credentials || {},
    status: input.status || 'connected',
    info: input.info || {},
    isActive: input.isActive !== false,
    lastSyncAt: null,
    products: [],
    orders: [],
    createdAt: now,
    updatedAt: now,
  };
  d.connections.push(c);
  writeAll(d);
  return c;
}

function listConnections() { return readAll().connections; }
function getConnection(id) { return readAll().connections.find((c) => c.id === id) || null; }

function updateConnection(id, patch = {}) {
  const d = readAll();
  const i = d.connections.findIndex((c) => c.id === id);
  if (i === -1) return null;
  d.connections[i] = { ...d.connections[i], ...patch, updatedAt: new Date().toISOString() };
  writeAll(d);
  return d.connections[i];
}

function deleteConnection(id) {
  const d = readAll();
  const n = d.connections.length;
  d.connections = d.connections.filter((c) => c.id !== id);
  writeAll(d);
  return d.connections.length < n;
}

module.exports = {
  STORE_FILE, redact, createConnection, listConnections,
  getConnection, updateConnection, deleteConnection,
};
