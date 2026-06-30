#!/usr/bin/env node
// tests/smoke/shortLinksSmoke.js — Smoke test for codes + campaign rollup + expiry. Run: npm run short-links:smoke

const sl = require('../../lib/shortLinks');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!sl.analytics, 'analytics present');

 // Codes are unambiguous (no 0/O/1/l/I) and the right length.
 const code = sl.codeGen.generate(8);
 t(code.length === 8 && !/[0O1lI]/.test(code), 'code generated without ambiguous chars');

 // Two links on the same campaign roll up together.
 const a = sl.linkStore.create({ destination: 'https://example.com/a', campaign: 'smoke-cmp' });
 const b = sl.linkStore.create({ destination: 'https://example.com/b', campaign: 'smoke-cmp' });
 sl.clickTracker.resolve(a.code, { contact: '+923001111111' });
 sl.clickTracker.resolve(b.code, { contact: '+923002222222' });
 const camp = sl.analytics.byCampaign().find((c) => c.campaign === 'smoke-cmp');
 t(camp && camp.clicks >= 2, 'by-campaign rollup sums clicks across links');
 t(camp.uniqueContacts >= 2, 'by-campaign rollup counts unique contacts');

 // Expired link resolves ok:false.
 const past = new Date(Date.now() - 1000).toISOString();
 const exp = sl.linkStore.create({ destination: 'https://example.com/expired', expiresAt: past });
 const r = sl.clickTracker.resolve(exp.code, {});
 t(r.ok === false && r.reason === 'expired', 'expired link does not resolve');

 // Unknown merge code is left intact (never breaks the message).
 const expand = sl.mergeLinks.expand('go {{link:NOPE}} end', { contact: '+923003333333' });
 t(expand.text.includes('NOPE'), 'unknown merge code left as-is');

 const ov = sl.analytics.overview();
 t(typeof ov.cards.totalClicks === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
