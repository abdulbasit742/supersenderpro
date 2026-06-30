'use strict';
/**
 * auditLog.js — Audit Feature #1: who did what, when.
 *
 * Once a tenant has a team (#team1) and API keys (#api1), you must be able to answer "who deleted
 * that campaign?" or "which key sent those messages?". This is an append-only audit trail of every
 * meaningful action: the actor (member/key), the action, the target, the tenant, IP, and time.
 *
 * Includes an Express middleware that auto-logs mutating requests (POST/PUT/PATCH/DELETE) so you get
 * coverage without instrumenting every route by hand. Sensitive bodies are NOT stored (only method,
 * path, status, actor) to avoid leaking PII/secrets into the log.
 *
 * Storage: JSON (data/audit_log.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'audit_log.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { seq: 0, entries: [] }; }
  catch { return { seq: 0, entries: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

/**
 * Record an audit entry.
 * @param {Object} e { tenantId?, actor, action, target?, meta?, ip? }
 *   actor: { type:'member'|'apikey'|'system', id, name? }
 */
function record(e = {}) {
  if (!e.action) throw new Error('action is required');
  const data = load();
  data.seq += 1;
  const entry = {
    seq: data.seq,                 // monotonic; gaps = tampering
    id: `AUD-${Date.now()}-${data.seq}`,
    tenantId: e.tenantId != null ? String(e.tenantId) : null,
    actor: e.actor || { type: 'system', id: null },
    action: e.action,
    target: e.target || null,
    meta: e.meta || null,
    ip: e.ip || null,
    at: nowIso()
  };
  data.entries.push(entry);
  if (data.entries.length > 50000) data.entries = data.entries.slice(-50000);
  save(data);
  return entry;
}

function query(filter = {}) {
  let rows = load().entries;
  if (filter.tenantId) rows = rows.filter(r => r.tenantId === String(filter.tenantId));
  if (filter.actorId) rows = rows.filter(r => r.actor && String(r.actor.id) === String(filter.actorId));
  if (filter.action) rows = rows.filter(r => r.action === filter.action);
  if (filter.since) { const t = new Date(filter.since).getTime(); rows = rows.filter(r => new Date(r.at).getTime() >= t); }
  rows = rows.slice().reverse();
  const limit = Math.min(Number(filter.limit) || 200, 1000);
  return rows.slice(0, limit);
}

// Map HTTP method -> verb for readable action names.
const VERB = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };

/**
 * Express middleware: auto-log mutating requests after they complete.
 * Reads actor from req.member (team #1) or req.apiKey (api #1). Never logs request bodies.
 */
function middleware() {
  return function (req, res, next) {
    const verb = VERB[req.method];
    if (!verb) return next();   // only log mutations
    res.on('finish', () => {
      try {
        const actor = req.member
          ? { type: 'member', id: req.member.id, name: req.member.name }
          : (req.apiKey ? { type: 'apikey', id: req.apiKey.id } : { type: 'system', id: null });
        record({
          tenantId: req.tenantId || (req.member && req.member.tenantId) || null,
          actor,
          action: `${verb} ${req.baseUrl || ''}${req.path || ''}`.trim(),
          target: null,
          meta: { status: res.statusCode, method: req.method },
          ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
        });
      } catch { /* never break the response */ }
    });
    next();
  };
}

function stats() {
  const rows = load().entries;
  const byAction = {};
  for (const r of rows) byAction[r.action] = (byAction[r.action] || 0) + 1;
  return { total: rows.length, byAction };
}

module.exports = { record, query, middleware, stats };
