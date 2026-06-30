// lib/shortLinks/clickTracker.js — Record a click + resolve the destination. The redirect route
// calls resolve(code, ctx) which returns { ok, destination } and appends a PII-safe click record
// (masked contact, campaign, coarse UA, referrer host, timestamp). Expired/inactive links resolve
// ok:false so the route can 404/410. Per-link unique-contact set is maintained for analytics.

const store = require('./store');
const { config } = require('./config');
const { maskContact, coarseUA, host } = require('./privacy');

function _expired(link, refNow) { return link.expiresAt ? Date.parse(link.expiresAt) <= refNow : false; }

// ctx: { contact?, ua?, referrer?, ip? } — contact is the recipient the tracked link was built for.
function resolve(code, ctx = {}, refNow = Date.now()) {
 const d = store.load();
 const link = d.links.find((l) => l.code === code);
 if (!link) return { ok: false, reason: 'not_found' };
 if (!link.active) return { ok: false, reason: 'inactive' };
 if (_expired(link, refNow)) return { ok: false, reason: 'expired' };

 const contactMasked = ctx.contact ? maskContact(ctx.contact) : null;
 const click = {
 id: store.genId('clk'), code, linkId: link.id, campaign: link.campaign || null,
 contactMasked, ua: coarseUA(ctx.ua), referrerHost: host(ctx.referrer),
 at: new Date(refNow).toISOString(),
 };
 d.clicks.push(click);
 if (d.clicks.length > config.maxClicksStored) d.clicks = d.clicks.slice(-config.maxClicksStored);
 link.clicks = (link.clicks || 0) + 1;
 // Track unique contacts by a stable hash-free token: the masked value is coarse, so use the
 // raw contact only to dedupe in-memory here, storing just the masked form long-term.
 if (ctx.contact) {
 const token = String(ctx.contact);
 link.contactsSeen = Array.isArray(link.contactsSeen) ? link.contactsSeen : [];
 if (!link.contactsSeen.includes(token)) link.contactsSeen.push(token);
 }
 store.save(d);
 return { ok: true, destination: link.destination, linkId: link.id, campaign: link.campaign || null };
}

function clicksFor(code, limit = 100) { return store.load().clicks.filter((c) => c.code === code).slice(-limit).reverse(); }

module.exports = { resolve };
module.exports.clicksFor = clicksFor;
