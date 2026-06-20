// lib/securityGateway/hashUtils.js — One-way hashing for IP / user-agent / identifiers.
// Never store raw IP. Hashing is salted + truncated. No reversible encoding.
const crypto = require('crypto');
const { config } = require('./config');

function sha(value) {
  return crypto.createHash('sha256').update(`${config.hashSalt}:${String(value == null ? '' : value)}`).digest('hex');
}
function hashIp(ip) { if (!ip) return 'iph_none'; return `iph_${sha(ip).slice(0, 16)}`; }
function hashUserAgent(ua) { if (!ua) return 'uah_none'; return `uah_${sha(ua).slice(0, 16)}`; }
function hashId(prefix, value) { if (!value) return `${prefix || 'id'}_none`; return `${prefix || 'id'}_${sha(value).slice(0, 16)}`; }

module.exports = { hashIp, hashUserAgent, hashId, sha };
