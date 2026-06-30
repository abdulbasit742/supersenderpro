#!/usr/bin/env node
// tests/smoke/aiAutoReplySmoke.js — Smoke test for intent + after-hours + FAQ. Run: npm run ai-auto-reply:smoke

const ar = require('../../lib/aiAutoReply');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ar.responder, 'responder present');

 const faqs = ar.faqStore.list();
 t(faqs.length >= 1, 'FAQ knowledge base seeds defaults');

 const m = ar.intent.match('do you offer a free trial?', faqs);
 t(m.faq && m.faq.id === 'trial' && m.confidence > 0.5, 'intent matches the trial FAQ with confidence');

 t(ar.intent.wantsHuman('can I talk to an agent?') === true, 'human-request intent detected');
 t(ar.intent.wantsHuman('what is the price') === false, 'normal question is not a human request');

 // After-hours: low-confidence message at 3am should yield the after-hours notice.
 const threeAm = new Date(); threeAm.setHours(3, 0, 0, 0);
 const r = await ar.responder.handle({ contact: '+923007778889', text: 'random off-topic thing xyz', refNow: threeAm.getTime() });
 t(r.action === 'after_hours' || r.action === 'handoff', 'off-hours unknown message handled (after-hours or handoff)');

 // Adding a custom FAQ then matching it.
 ar.faqStore.upsert({ id: 'delivery', keywords: ['delivery', 'shipping', 'deliver'], question: 'Do you deliver?', answer: 'Yes, we deliver nationwide.' });
 const m2 = ar.intent.match('do you offer delivery?', ar.faqStore.list());
 t(m2.faq && m2.faq.id === 'delivery', 'custom FAQ is matchable after upsert');

 const ov = ar.responder.overview();
 t(typeof ov.cards.total === 'number', 'overview returns counts');
 t(typeof ov.hubAvailable === 'boolean', 'overview reports whether llmHub is available');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
