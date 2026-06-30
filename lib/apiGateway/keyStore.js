// lib/apiGateway/keyStore.js — Issue / verify / revoke scoped API keys. The plaintext secret is
// returned exactly ONCE at issuance; only a SHA-256 hash + a short masked label are stored, so a
// leaked store file can't be used to authenticate. Keys are revoked (status), never hard-deleted.

const crypto = require('crypto');
const store = require('./store');
const { config, SCOPES } = require('./config');

function _hash(secret) { return crypto.createHash('sha256').update(String(secret)).digest('hex'); }
function _randomSecret() { return crypto.randomBytes(24).toString('hex'); }
function _mask(full) { return full.slice(0, config.keyPrefix.length + 5) + '...' + full.slice(-4); }

function _validScopes(scopes) {
 const list = Array.isArray(scopes) && scopes.length ? scopes : ['*'];
 const bad = list.filter((s) => !SCOPES.includes(s));
 if (bad.length) throw new Error('unknown scope(s): ' + bad.join(', '));
 return list;
}

// Returns { key (public record), secret (PLAINTEXT, shown once) }.
function issue({ name = 'API key', scopes, rateLimitPerMin, ownerTenantId = 'default' } = {}) {
 const validScopes = _validScopes(scopes);
 const secretBody = _randomSecret();
 const full = `${config.keyPrefix}_${secretBody}`;
 const d = store.load();
 const rec = {
 id: store.genId('key'), name: String(name),
 hash: _hash(full), masked: _mask(full),
 scopes: validScopes, rateLimitPerMin: Number(rateLimitPerMin) > 0 ? Number(rateLimitPerMin) : config.defaultRateLimitPerMin,
 ownerTenantId: String(ownerTenantId), status: 'active',
 lastUsedAt: null, createdAt: store.nowIso(), revokedAt: null,
 };
 d.keys.push(rec); store.save(d);
 return { key: publicView(rec), secret: full };
}

function publicView(k) {
 if (!k) return null;
 return { id: k.id, name: k.name, masked: k.masked, scopes: k.scopes, rateLimitPerMin: k.rateLimitPerMin, ownerTenantId: k.ownerTenantId, status: k.status, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt, revokedAt: k.revokedAt };
}

function all() { return store.load().keys.map(publicView); }
function getById(id) { return publicView(store.load().keys.find((k) => k.id === id)); }

// Verify a presented secret. Returns the raw key record (with hash) or null. Stamps lastUsedAt.
function verifySecret(presented) {
 if (!presented) return null;
 const h = _hash(presented);
 const d = store.load();
 const k = d.keys.find((x) => x.hash === h && x.status === 'active');
 if (!k) return null;
 k.lastUsedAt = store.nowIso(); store.save(d);
 return k;
}

function revoke(id) {
 const d = store.load(); const k = d.keys.find((x) => x.id === id);
 if (!k) throw new Error('key not found');
 k.status = 'revoked'; k.revokedAt = store.nowIso(); store.save(d);
 return publicView(k);
}
function rotate(id) {
 const d = store.load(); const k = d.keys.find((x) => x.id === id);
 if (!k) throw new Error('key not found');
 k.status = 'revoked'; k.revokedAt = store.nowIso(); store.save(d);
 return issue({ name: k.name + ' (rotated)', scopes: k.scopes, rateLimitPerMin: k.rateLimitPerMin, ownerTenantId: k.ownerTenantId });
}

function hasScope(keyRec, scope) {
 if (!keyRec) return false;
 return keyRec.scopes.includes('*') || keyRec.scopes.includes(scope);
}

module.exports = { issue, verifySecret, revoke, rotate, hasScope, all, getById, publicView };
