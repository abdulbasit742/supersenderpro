#!/usr/bin/env node
// tests/smoke/consentCenterSmoke.js — Smoke test for keyword edge cases + opt-in model. Run: npm run consent-center:smoke

const cc = require('../../lib/consentCenter');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!cc.consentEngine, 'engine present');

 // Keyword classification edge cases.
 t(cc.keywords.classify('stop.') === 'opt_out', 'trailing punctuation still opts out');
 t(cc.keywords.classify('STOP PLEASE') === 'opt_out', 'STOP with trailing words opts out');
 t(cc.keywords.classify('non-stop delivery') === null, 'keyword inside a sentence is NOT an opt-out');
 t(cc.keywords.classify('resume') === 'opt_in', 'resume opts in');
 t(cc.keywords.classify('') === null, 'empty message classifies as none');

 // Suppression list contains opted-out, masked.
 cc.consentEngine.setStatus('+923111222333', 'opted_out', 'manual');
 const sup = cc.consentEngine.suppressionList(100);
 t(sup.some((s) => s.contactMasked && s.contactMasked.indexOf('222333') === -1), 'suppression list masks contacts');

 // Strict opt-in model: unknown is blocked when allowUnknown is false.
 process.env.CONSENT_ALLOW_UNKNOWN = 'false';
 delete require.cache[require.resolve('../../lib/consentCenter/config')];
 delete require.cache[require.resolve('../../lib/consentCenter/consentEngine')];
 delete require.cache[require.resolve('../../lib/consentCenter')];
 const cc2 = require('../../lib/consentCenter');
 const g = cc2.consentEngine.canSend('+923444555666'); // never seen
 t(g.allowed === false && /opt-in/.test(g.reason), 'strict opt-in model blocks unknown contacts');
 // but an explicitly opted-in contact is allowed
 cc2.consentEngine.setStatus('+923444555666', 'opted_in', 'form');
 t(cc2.consentEngine.canSend('+923444555666').allowed === true, 'explicit opt-in is allowed even in strict model');

 const ov = cc2.consentEngine.overview();
 t(typeof ov.cards.optedOut === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
