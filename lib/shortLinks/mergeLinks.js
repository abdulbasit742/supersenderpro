// lib/shortLinks/mergeLinks.js — Expand link merge tags in a message into per-contact tracked
// short URLs. Supports {{link:https://dest}} (inline destination) and {{link:CODE}} (existing
// code). Appends ?c=<contact>&cmp=<campaign> so the redirect can attribute the click. Designed to
// run right before a send (e.g. inside drip #6 / scheduler #17 / broadcast).

const linkStore = require('./linkStore');

const TAG = /\{\{\s*link:([^}]+)\}\}/g;

function _trackedUrl(code, { contact, campaign } = {}) {
 const base = linkStore.shortUrl(code);
 const params = [];
 if (contact) params.push('c=' + encodeURIComponent(contact));
 if (campaign) params.push('cmp=' + encodeURIComponent(campaign));
 return params.length ? `${base}?${params.join('&')}` : base;
}

// Replace every {{link:...}} in text with a tracked short URL for this contact.
function expand(text, { contact, campaign } = {}) {
 const created = [];
 const out = String(text == null ? '' : text).replace(TAG, (_m, arg) => {
 const a = String(arg).trim();
 let code;
 if (/^https?:\/\//i.test(a)) {
 const link = linkStore.create({ destination: a, campaign });
 code = link.code; created.push(link);
 } else {
 const existing = linkStore.getByCode(a);
 if (!existing) return a; // unknown code: leave as-is rather than break the message
 code = existing.code;
 }
 return _trackedUrl(code, { contact, campaign });
 });
 return { text: out, createdLinks: created.map((l) => ({ code: l.code, shortUrl: l.shortUrl, destination: l.destination })) };
}

module.exports = { expand, TAG };
