// lib/shortLinks/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');
const urlGuard = require('./urlGuard');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.links) && Array.isArray(d.clicks));
 ok('blocks_internal_hosts', urlGuard.validate('http://127.0.0.1/x').ok === false, 'localhost destination rejected');
 ok('blocks_non_http', urlGuard.validate('ftp://x/y').ok === false, 'non-http scheme rejected');
 ok('allows_public_https', urlGuard.validate('https://example.com/p').ok === true, 'public https allowed');
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, baseUrl: config.baseUrl, routePrefix: config.routePrefix, allowedHosts: config.allowedHosts.length ? config.allowedHosts : 'any-public' },
 counts: { links: d.links.length, clicks: d.clicks.length },
 checks,
 };
}

module.exports = { run };
