#!/usr/bin/env node
// scripts/template-library-check.js — Offline safety + behavior check. Run: npm run template-library:check

const tl = require('../lib/templateLibrary');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(tl && tl.templateStore, 'module loads');
 assert(tl.templateStore.all().length >= 1, 'starter templates seeded');

 // Variable extraction + render with fallback + missing.
 const vars = tl.variables.extract('Hi {{name}}, order {{orderId}} total {{currency|Rs}} {{amount}}');
 assert(vars.map((v) => v.name).join(',') === 'name,orderId,currency,amount', 'extracts all variable names in order');
 assert(vars.find((v) => v.name === 'currency').hasFallback === true, 'detects fallback on currency');

 const text = tl.variables.render('Hi {{name|there}}, total {{currency|Rs}} {{amount}}', { name: 'Sara', amount: 500 });
 assert(text === 'Hi Sara, total Rs 500', 'render fills values + uses fallback for currency');
 const text2 = tl.variables.render('Hi {{name|there}}', {});
 assert(text2 === 'Hi there', 'fallback used when value missing');

 // Validate flags missing required vars (no fallback) given a context.
 const v = tl.variables.validate('Hi {{name}}, {{orderId}} {{x|y}}', { context: { name: 'Ali' } });
 assert(v.missingInContext.includes('orderId') && !v.missingInContext.includes('name') && !v.missingInContext.includes('x'), 'flags only the missing required var');

 // Create + version on edit.
 const t = tl.templateStore.upsert({ name: 'Promo', category: 'promo', body: '{{name}}, 10% off!' });
 assert(t.version === 1, 'new template starts at version 1');
 const t2 = tl.templateStore.upsert({ id: t.id, body: '{{name}}, 20% off today!' });
 assert(t2.version === 2, 'editing the body bumps the version');
 const hist = tl.templateStore.history(t.id);
 assert(hist.length === 1 && hist[0].body === '{{name}}, 10% off!', 'previous body kept in history');

 // Unknown category rejected.
 let threw = false; try { tl.templateStore.upsert({ name: 'x', category: 'nope', body: 'a' }); } catch (_e) { threw = true; }
 assert(threw, 'rejects an unknown category');

 // renderTemplate by id validates + renders.
 const r = tl.renderTemplate(t.id, { name: 'Bilal' });
 assert(r.text === 'Bilal, 20% off today!' && r.ok === true, 'renderTemplate fills the stored body');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all template-library checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
