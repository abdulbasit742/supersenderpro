'use strict';
/**
 * lib/embeddedSignup/connections.js - tenant-scoped store of connected WhatsApp Business
 * Accounts (WABAs). One tenant can connect multiple numbers.
 *
 * A connection: { id, tenantId, wabaId, phoneNumberId, displayPhoneNumber, verifiedName,
 *   accessToken(secret, never returned), status, connectedAt, updatedAt }
 */
const { paths } = require('./config');
const store = require('./store');
const { nowISO, id } = require('./util');

const read = (tid) => store.readJSON(paths.connections(tid), { connections: [] });
const write = (tid, d) => store.writeJSON(paths.connections(tid), d);

function list(tid) {
  return read(tid).connections.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
function get(tid, connId) { return read(tid).connections.find((c) => c.id === connId) || null; }
function getByWaba(tid, wabaId) { return read(tid).connections.find((c) => c.wabaId === wabaId) || null; }

/** Create or update the connection for a WABA (dedupe by wabaId). */
function upsert(tid, input = {}) {
  if (!input.wabaId) throw new Error('wabaId is required');
  const data = read(tid);
  let c = data.connections.find((x) => x.wabaId === input.wabaId);
  if (!c) {
    c = { id: id('waba'), tenantId: tid, wabaId: input.wabaId, status: 'pending', connectedAt: nowISO(), updatedAt: nowISO() };
    data.connections.push(c);
  }
  ['phoneNumberId', 'displayPhoneNumber', 'verifiedName', 'accessToken', 'status'].forEach((k) => {
    if (input[k] !== undefined) c[k] = input[k];
  });
  c.updatedAt = nowISO();
  write(tid, data);
  return c;
}

function setStatus(tid, connId, status) {
  const data = read(tid);
  const c = data.connections.find((x) => x.id === connId);
  if (!c) return null;
  c.status = status; c.updatedAt = nowISO();
  write(tid, data);
  return c;
}

function remove(tid, connId) {
  const data = read(tid);
  const before = data.connections.length;
  data.connections = data.connections.filter((c) => c.id !== connId);
  write(tid, data);
  return data.connections.length < before;
}

module.exports = { list, get, getByWaba, upsert, setStatus, remove };
