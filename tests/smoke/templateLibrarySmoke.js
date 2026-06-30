#!/usr/bin/env node
// tests/smoke/templateLibrarySmoke.js — Smoke test for parse/render/versioning/search. Run: npm run template-library:smoke

const tl = require('../../lib/templateLibrary');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!tl.templateStore, 'store present');

 // Variable parsing edge cases.
 const vars = tl.variables.parse('{{a}} {{a}} {{b|x}} no-vars {{c}}');
 t(vars.length === 3, 'duplicate variable names dedupe');
 t(vars.find((v) => v.name === 'b').default === 'x', 'default captured');

 // Empty-string provided value falls back to default/required handling.
 const r = tl.variables.render('Hi {{name|friend}}', { name: '' });
 t(r.text === 'Hi friend', 'empty value falls back to default');

 // Create + search by category and free text.
 const a = tl.templateStore.create({ name: 'Eid Offer', category: 'promo', tags: ['eid'], body: 'Eid Mubarak {{name}}! {{discount|10}}% off.' });
 tl.templateStore.create({ name: 'Receipt', category: 'billing', body: 'Thanks {{name}}, paid {{amount}}.' });
 const promo = tl.templateStore.list({ category: 'promo' });
 t(promo.some((x) => x.id === a.id), 'list filters by category');
 const byText = tl.templateStore.list({ q: 'eid mubarak' });
 t(byText.some((x) => x.id === a.id), 'free-text search matches body');
 const byTag = tl.templateStore.list({ tag: 'eid' });
 t(byTag.some((x) => x.id === a.id), 'tag filter works');

 // Versioning history grows on body edits.
 tl.templateStore.update(a.id, { body: 'Eid Mubarak {{name}}! Big {{discount|20}}% off.' });
 const raw = tl.templateStore.raw(a.id);
 t(raw.version === 2 && raw.history.length === 1, 'version bumped + prior body snapshotted to history');

 // Max-length guard truncates + reports.
 const long = 'x'.repeat(tl.config.maxRenderChars + 50);
 const big = tl.templateStore.create({ name: 'Long', body: long });
 const rendered = tl.renderer.render(big.id, {});
 t(rendered.truncatedFrom && rendered.text.length === tl.config.maxRenderChars, 'over-long render is truncated to the cap');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
