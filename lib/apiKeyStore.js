'use strict';

/**
 * lib/apiKeyStore.js — API keys for external/developer access.
 * Only a SHA-256 hash of each key is stored; the raw key is shown once at
 * creation. Stored under data/api_keys.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'api_keys.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ keys: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try { const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}'); if (!Array.isArray(d.keys)) d.keys = []; return d; }
  catch { return { keys: [] }; }
}
function writeAll(d) { ensureStore(); const tmp = STORE_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, STORE_FILE); }
function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }

/** Create a key. Returns the raw key ONCE (never recoverable afterwards). */
function generate(label, scopes = ['*']) {
  const d = readAll();
  const raw = 'ssp_' + crypto.randomBytes(24).toString('hex');
  const rec = {
    id: 'key_' + crypto.randomBytes(6).toString('hex'),
    label: String(label || 'API key'),
    prefix: raw.slice(0, 12),
    hash: sha256(raw),
    scopes: Array.isArray(scopes) && scopes.length ? scopes : ['*'],
    revoked: false,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  d.keys.push(rec); writeAll(d);
  return { id: rec.id, key: raw, prefix: rec.prefix, scopes: rec.scopes };
}

function list() {
  return readAll().keys.map(({ hash, ...rest }) => rest); // never expose hash
}

/** Verify a raw key; returns the key record (sans hash) or null. */
function verify(rawKey) {
  const d = readAll();
  const h = sha256(rawKey || '');
  const rec = d.keys.find((k) => k.hash === h && !k.revoked);
  if (!rec) return null;
  rec.lastUsedAt = new Date().toISOString();
  writeAll(d);
  const { hash, ...safe } = rec;
  return safe;
}

function hasScope(rec, scope) {
  if (!rec || !Array.isArray(rec.scopes)) return false;
  return rec.scopes.includes('*') || rec.scopes.includes(scope);
}

function revoke(id) {
  const d = readAll();
  const k = d.keys.find((x) => x.id === id);
  if (!k) return false;
  k.revoked = true; writeAll(d); return true;
}

/** Express middleware factory: require a valid API key (optionally a scope). */
function requireApiKey(scope) {
  return (req, res, next) => {
    const hdr = req.headers['authorization'] || '';
    const raw = hdr.startsWith('Bearer ') ? hdr.slice(7) : (req.headers['x-api-key'] || '');
    const rec = verify(raw);
    if (!rec) return res.status(401).json({ ok: false, error: 'invalid or missing API key' });
    if (scope && !hasScope(rec, scope)) return res.status(403).json({ ok: false, error: 'insufficient scope' });
    req.apiKey = rec;
    next();
  };
}

module.exports = { STORE_FILE, generate, list, verify, hasScope, revoke, requireApiKey, sha256 };
