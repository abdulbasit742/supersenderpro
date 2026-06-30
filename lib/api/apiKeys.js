'use strict';
/**
 * apiKeys.js — API Feature #1: developer API keys for programmatic access.
 *
 * Lets a tenant call SuperSender from their own backend (send a message, read CRM, etc.) without the
 * dashboard. Security basics done right:
 *   - the raw key is shown ONCE at creation; only a SHA-256 hash is stored
 *   - keys carry scopes (send | read | manage) enforced per route
 *   - revoke instantly; track last-used + created-by
 *
 * Provides an Express middleware `authenticate` that reads `Authorization: Bearer <key>` or
 * `x-api-key: <key>`, validates it, and attaches { tenantId, scopes, keyId } to req.apiAuth.
 *
 * Storage: JSON (data/api_keys.json).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'api_keys.json');
const VALID_SCOPES = ['send', 'read', 'manage'];

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { keys: [] }; }
  catch { return { keys: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/**
 * Issue a new key. Returns { record, rawKey }. SHOW rawKey to the user ONCE; it is not recoverable.
 * @param {Object} opts { tenantId, name?, scopes?, createdBy? }
 */
function issueKey(opts = {}) {
  if (!opts.tenantId) throw new Error('tenantId is required');
  const scopes = (Array.isArray(opts.scopes) ? opts.scopes : ['send', 'read']).filter(s => VALID_SCOPES.includes(s));
  const rawKey = `ssk_${crypto.randomBytes(24).toString('hex')}`;
  const data = load();
  const record = {
    id: `KEY-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: String(opts.tenantId),
    name: opts.name || 'API key',
    scopes: scopes.length ? scopes : ['send', 'read'],
    keyHash: sha256(rawKey),
    prefix: rawKey.slice(0, 12),       // shown in listings so users can identify it
    active: true,
    createdBy: opts.createdBy || null,
    createdAt: nowIso(),
    lastUsedAt: null
  };
  data.keys.push(record);
  save(data);
  const { keyHash, ...safe } = record;
  return { record: safe, rawKey };
}

function listKeys(tenantId) {
  const data = load();
  return data.keys
    .filter(k => !tenantId || k.tenantId === String(tenantId))
    .map(({ keyHash, ...safe }) => safe);
}

function revokeKey(id) {
  const data = load();
  const k = data.keys.find(x => x.id === id);
  if (!k) return null;
  k.active = false;
  k.revokedAt = nowIso();
  save(data);
  const { keyHash, ...safe } = k;
  return safe;
}

/** Validate a raw key. Returns the key record (without hash) or null. Updates lastUsedAt. */
function verify(rawKey) {
  if (!rawKey) return null;
  const h = sha256(rawKey);
  const data = load();
  const k = data.keys.find(x => x.keyHash === h && x.active);
  if (!k) return null;
  k.lastUsedAt = nowIso();
  save(data);
  const { keyHash, ...safe } = k;
  return safe;
}

/**
 * Express middleware factory. Pass a required scope (or none) to gate a route.
 *   router.post('/send', apiKeys.authenticate('send'), handler)
 */
function authenticate(requiredScope) {
  return function (req, res, next) {
    const header = req.headers['authorization'] || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const raw = bearer || req.headers['x-api-key'] || null;
    const key = verify(raw);
    if (!key) return res.status(401).json({ ok: false, error: 'invalid or missing API key' });
    if (requiredScope && !key.scopes.includes(requiredScope)) {
      return res.status(403).json({ ok: false, error: `missing scope: ${requiredScope}` });
    }
    req.apiAuth = { tenantId: key.tenantId, scopes: key.scopes, keyId: key.id };
    next();
  };
}

module.exports = { VALID_SCOPES, issueKey, listKeys, revokeKey, verify, authenticate };
