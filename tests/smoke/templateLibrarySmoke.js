#!/usr/bin/env node
// tests/smoke/templateLibrarySmoke.js — Smoke test for categories + dotted vars + archive. Run: npm run template-library:smoke

const tl = require('../../lib/templateLibrary');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!tl.templateStore, 'store present');

 // Dotted variable paths resolve from a nested context.
 const text = tl.variables.render('Hi {{contact.name}}, city {{contact.city|N/A}}', { contact: { name: 'Omar' } });
 t(text === 'Hi Omar, city N/A', 'dotted paths resolve + fallback for missing nested value');

 // Category filter.
 tl.templateStore.upsert({ name: 'Smoke promo', category: 'promo', body: 'deal {{x}}' });
 const promos = tl.templateStore.all({ category: 'promo' });
 t(promos.length >= 1 && promos.every((p) => p.category === 'promo'), 'category filter returns only that category');

 // Tag filter.
 const tagged = tl.templateStore.upsert({ name: 'Tagged', category: 'general', body: 'hi {{name}}', tags: ['eid'] });
 const byTag = tl.templateStore.all({ tag: 'eid' });
 t(byTag.find((x) => x.id === tagged.id), 'tag filter finds the tagged template');

 // Archive hides it from the default list but it still exists with includeArchived.
 tl.templateStore.archive(tagged.id);
 t(!tl.templateStore.all().find((x) => x.id === tagged.id), 'archived template hidden by default');
 t(!!tl.templateStore.all({ includeArchived: true }).find((x) => x.id === tagged.id), 'archived template visible with includeArchived');

 // Variables list stored on the template reflects the body.
 const v = tl.templateStore.upsert({ name: 'Vars', category: 'general', body: '{{a}} {{b}} {{c|x}}' });
 t(v.variables.join(',') === 'a,b,c', 'template stores its variable list');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
