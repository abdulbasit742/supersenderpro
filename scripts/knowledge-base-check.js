#!/usr/bin/env node
// scripts/knowledge-base-check.js — Offline safety + behavior check. Run: npm run knowledge-base:check

const kb = require('../lib/knowledgeBase');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(kb && kb.articleStore, 'module loads');

 // Create a draft -> not searchable until published.
 const draft = kb.articleStore.create({ title: 'How to reset your password', body: 'Go to settings, click Reset Password, follow the email link.', category: 'account', tags: ['password', 'login', 'reset'] });
 assert(draft.status === 'draft', 'new article is draft');
 let res = kb.search('reset password');
 assert(!res.find((r) => r.id === draft.id), 'draft article is NOT returned by published search');

 // Publish -> now searchable + ranks for relevant query.
 kb.articleStore.publish(draft.id);
 // Add a couple more published articles so ranking has competition.
 kb.articleStore.create({ title: 'Pricing and plans', body: 'Our plans start from a Starter tier with monthly billing.', category: 'billing', tags: ['pricing', 'plans'], status: 'published' });
 kb.articleStore.create({ title: 'Shipping times', body: 'Orders ship within 2-3 business days nationwide.', category: 'orders', tags: ['shipping', 'delivery'], status: 'published' });

 res = kb.search('reset password');
 assert(res.length >= 1 && res[0].id === draft.id, 'published article ranks first for its query');
 assert(res[0].snippet && res[0].snippet.length > 0, 'result includes a snippet');

 // Irrelevant query should not surface the password article strongly.
 const ship = kb.search('shipping delivery time');
 assert(ship[0] && /Shipping/.test(ship[0].title), 'distinct query routes to the right article');

 // View counting only on published.
 const before = kb.articleStore.get(draft.id).views;
 kb.articleStore.get(draft.id, { countView: true });
 const after = kb.articleStore.get(draft.id).views;
 assert(after === before + 1, 'view count increments for a published article');

 // Archive removes it from search.
 kb.articleStore.archive(draft.id);
 const res2 = kb.search('reset password');
 assert(!res2.find((r) => r.id === draft.id), 'archived article drops out of search');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all knowledge-base checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
