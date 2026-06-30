// lib/shortLinks/urlGuard.js — Validate destination URLs to prevent open-redirect / SSRF-ish abuse.
// Only http/https allowed. Rejects credentials in the URL. Optional host allowlist. Blocks obvious
// internal hosts (localhost, link-local, RFC1918, metadata IPs) unless explicitly allowlisted.

const { config } = require('./config');

const PRIVATE_PATTERNS = [
 /^localhost$/i, /^127\./, /^0\.0\.0\.0$/, /^10\./, /^192\.168\./,
 /^172\.(1[6-9]|2[0-9]|3[0-1])\./, /^169\.254\./, /^::1$/, /^fc00:/i, /^fe80:/i,
 /metadata\.google/i, /^169\.254\.169\.254$/,
];

function validate(rawUrl) {
 let u;
 try { u = new URL(String(rawUrl)); } catch (_e) { return { ok: false, reason: 'invalid URL' }; }
 if (!['http:', 'https:'].includes(u.protocol)) return { ok: false, reason: 'only http/https allowed' };
 if (u.username || u.password) return { ok: false, reason: 'credentials in URL not allowed' };
 const host = u.hostname.toLowerCase();
 if (config.allowedHosts.length) {
 const allowed = config.allowedHosts.some((h) => host === h || host.endsWith('.' + h));
 if (!allowed) return { ok: false, reason: 'host not in allowlist' };
 return { ok: true, url: u.toString(), host };
 }
 if (PRIVATE_PATTERNS.some((re) => re.test(host))) return { ok: false, reason: 'internal/private host blocked' };
 return { ok: true, url: u.toString(), host };
}

module.exports = { validate, PRIVATE_PATTERNS };
