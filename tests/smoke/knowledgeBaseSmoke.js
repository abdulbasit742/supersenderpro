#!/usr/bin/env node
// tests/smoke/knowledgeBaseSmoke.js — Smoke test for ranking + tokenizer + filters. Run: npm run knowledge-base:smoke

const kb = require('../../lib/knowledgeBase');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!kb.searchModule, 'search module present');

 // Tokenizer drops stopwords + short tokens.
 const toks = kb.tokenize.tokens('How do I do a refund?');
 t(toks.includes('refund') && !toks.includes('do') && !toks.includes('i'), 'tokenizer keeps content words, drops stopwords');

 // Title/tag matches outrank body-only matches.
 const a = kb.articleStore.create({ title: 'Refund policy', body: 'We process refunds in 5 days.', tags: ['refund', 'returns'], status: 'published' });
 const b = kb.articleStore.create({ title: 'Welcome guide', body: 'Mention the word refund once here somewhere.', tags: ['intro'], status: 'published' });
 const res = kb.search('refund');
 const ai = res.findIndex((r) => r.id === a.id); const bi = res.findIndex((r) => r.id === b.id);
 t(ai !== -1 && (bi === -1 || ai < bi), 'title/tag match ranks above a body-only mention');

 // Snippet centers on the matched term.
 const snip = kb.searchModule._snippet('Some intro text. The refund window is 7 days. Thanks.', new Set(['refund']));
 t(snip.toLowerCase().includes('refund'), 'snippet includes the matched term');

 // Filters by category + tag.
 kb.articleStore.create({ title: 'Billing FAQ', body: 'Billing details.', category: 'billing', tags: ['billing'], status: 'published' });
 const byCat = kb.articleStore.list({ category: 'billing' });
 t(byCat.length >= 1 && byCat.every((x) => x.category === 'billing'), 'list filters by category');

 // Empty query returns no results (not an error).
 t(Array.isArray(kb.search('')) && kb.search('').length === 0, 'empty query returns an empty array');

 const ov = kb.doctor.run();
 t(typeof ov.counts.published === 'number', 'doctor reports published count');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
