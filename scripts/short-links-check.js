#!/usr/bin/env node
// scripts/short-links-check.js — Offline safety + behavior check. Run: npm run short-links:check

const sl = require('../lib/shortLinks');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(sl && sl.linkStore, 'module loads');

 // URL guard blocks internal + non-http, allows public https.
 assert(sl.urlGuard.validate('http://localhost:3001/x').ok === false, 'localhost destination blocked');
 assert(sl.urlGuard.validate('http://169.254.169.254/latest/meta-data').ok === false, 'metadata IP blocked');
 assert(sl.urlGuard.validate('javascript:alert(1)').ok === false, 'non-http scheme blocked');
 assert(sl.urlGuard.validate('https://example.com/promo').ok === true, 'public https allowed');

 // Create a link + resolve a click (PII-safe).
 const link = sl.linkStore.create({ destination: 'https://example.com/sale', campaign: 'eid' });
 assert(link.code && link.shortUrl.includes(link.code), 'short link created with code + url');
 const r = sl.clickTracker.resolve(link.code, { contact: '+923001234567', ua: 'Mozilla/5.0 (Android 14)' , referrer: 'https://wa.me/' });
 assert(r.ok && r.destination === 'https://example.com/sale', 'click resolves to destination');
 const clicks = sl.clickTracker.clicksFor(link.code);
 assert(clicks[0].contactMasked.indexOf('1234567') === -1, 'contact masked in click record');
 assert(clicks[0].ua === 'android', 'UA reduced to coarse family (no fingerprint)');

 // Merge-tag expansion builds a per-contact tracked URL.
 const exp = sl.mergeLinks.expand('Check this {{link:https://example.com/x}} now', { contact: '+923009998877', campaign: 'eid' });
 assert(/\/l\/[A-Za-z0-9]+\?c=/.test(exp.text), 'merge tag expands to a tracked short URL with contact param');
 assert(exp.createdLinks.length === 1, 'inline destination created a link');

 // Inactive link resolves ok:false.
 sl.linkStore.setActive(link.id, false);
 const r2 = sl.clickTracker.resolve(link.code, {});
 assert(r2.ok === false && r2.reason === 'inactive', 'inactive link no longer resolves');

 // Analytics rollup.
 const a = sl.analytics.forLink(link.code);
 assert(a.totalClicks >= 1 && a.uniqueContacts >= 1, 'analytics reports clicks + unique contacts');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all short-links checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
