'use strict';
/**
 * apiKeys.js — API Feature #1: developer API keys.
 *
 * Lets a tenant call SuperSender programmatically from their own backend (send messages, read data,
 * manage resources) without using a session. Security basics done right:
 *   - the raw key is shown ONCE at creation; we store only a SHA-256 hash
 *   - keys carry scopes (e.g. ['send','read']) enforced per route
 *   - keys can be revoked; last-used + usage count tracked
 *   - an Express middleware authenticates `Authorization: Bearer ssp_live_xxx`
 *
 * Storage: JSON (data/api_keys.json). Move to Postgres with the rest; API unchanged.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'api_keys.json');
const SCOPES = ['send', 'read', 'manage'];

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { keys: [] }; }
  catch { return { keys: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const sha256 = (s) => crypto.createHmac ? crypto.createHash('sha256').update(String(s)).digest('hex') : String(s);

function genRawKey() {
  // ssp_live_<32 hex> — prefix helps users spot/rotate keys
  return `ssp_live_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Issue a key. Returns the FULL key object INCLUDING the raw key (only time it's available).
 * @param {Object} opts { tenantId, name, scopes? }
 */
function issueKey(opts = {}) {
  if (!opts.tenantId) throw new Error('tenantId is required');
  const scopes = (Array.isArray(opts.scopes) && opts.scopes.length ? opts.scopes : ['send', 'read'])
    .filter(s => SCOPES.includes(s));
  const raw = genRawKey();
  const data = load();
  const record = {
    id: `KEY-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: String(opts.tenantId),
    name: opts.name || 'API key',
    prefix: raw.slice(0, 16),        // shown in lists so users can identify it
    hash: sha256(raw),
    scopes,
    active: true,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: nowIso()
  };
  data.keys.push(record);
  save(data);
  // return raw ONCE; never stored
  return { ...publicView(record), key: raw };
}

function publicView(k) {
  return { id: k.id, tenantId: k.tenantId, name: k.name, prefix: k.prefix, scopes: k.scopes, active: k.active, lastUsedAt: k.lastUsedAt, usageCount: k.usageCount, createdAt: k.createdAt };
}

function listKeys(tenantId) {
  const data = load();
  return data.keys.filter(k => !tenantId || k.tenantId === String(tenantId)).map(publicView);
}

function revokeKey(id) {
  const data = load();
  const k = data.keys.find(x => x.id === id);
  if (!k) return null;
  k.active = false;
  k.revokedAt = nowIso();
  save(data);
  return publicView(k);
}

/** Verify a raw key. Returns the key record (public) + tenantId if valid & active, else null. */
function verify(raw) {
  if (!raw) return null;
  const h = sha256(raw);
  const data = load();
  const k = data.keys.find(x => x.hash === h && x.active);
  if (!k) return null;
  k.lastUsedAt = nowIso();
  k.usageCount = (k.usageCount || 0) + 1;
  save(data);
  return publicView(k);
}

/**
 * Express middleware factory. Usage: app.use('/api/v1', requireApiKey('send'))
 * Reads Authorization: Bearer <key>. Attaches req.apiKey + req.tenantId on success.
 */
function requireApiKey(requiredScope) {
  return function (req, res, next) {
    const auth = req.headers['authorization'] || '';
    const raw = auth.startsWith('Bearer ') ? auth.slice(7).trim() : (req.headers['x-api-key'] || '');
    const k = verify(raw);
    if (!k) return res.status(401).json({ ok: false, error: 'invalid or missing API key' });
    if (requiredScope && !k.scopes.includes(requiredScope) && !k.scopes.includes('manage')) {
      return res.status(403).json({ ok: false, error: `key lacks required scope: ${requiredScope}` });
    }
    req.apiKey = k;
    req.tenantId = k.tenantId;
    next();
  };
}

module.exports = { SCOPES, issueKey, listKeys, revokeKey, verify, requireApiKey };
