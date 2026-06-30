#!/usr/bin/env node
// scripts/template-library-check.js — Offline safety + behavior check. Run: npm run template-library:check

const tl = require('../lib/templateLibrary');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(tl && tl.templateStore, 'module loads');

 // Create derives variables (required + default).
 const t = tl.templateStore.create({ name: 'Welcome', category: 'onboarding', body: 'Hi {{name}}, your trial ends {{date|soon}}.' });
 assert(t.status === 'draft' && t.version === 1, 'new template starts as draft v1');
 assert(t.variables.find((v) => v.name === 'name').required === true, 'name is a required variable');
 assert(t.variables.find((v) => v.name === 'date').required === false, 'date has a default (not required)');

 // Render: missing required var is reported + left visible.
 const r1 = tl.renderer.render(t.id, {});
 assert(r1.missing.includes('name'), 'missing required var reported');
 assert(r1.text.includes('soon'), 'default used for the var with a default');

 // Render with values fills correctly + records usage.
 const r2 = tl.renderer.render(t.id, { name: 'Ali', date: 'July 5' });
 assert(r2.text === 'Hi Ali, your trial ends July 5.', 'values substituted correctly');
 assert(tl.templateStore.get(t.id).usageCount >= 1, 'usage recorded on render');

 // Editing the body bumps version; an approved template returns to draft on edit.
 tl.templateStore.approve(t.id);
 assert(tl.templateStore.get(t.id).status === 'approved', 'template can be approved');
 const upd = tl.templateStore.update(t.id, { body: 'Hi {{name}}! Trial ends {{date|soon}}.' });
 assert(upd.version === 2 && upd.status === 'draft', 'editing body bumps version + resets to draft for re-review');

 // Approval gate on render.
 process.env.TEMPLATE_LIBRARY_REQUIRE_APPROVED = 'true';
 delete require.cache[require.resolve('../lib/templateLibrary/config')];
 delete require.cache[require.resolve('../lib/templateLibrary/renderer')];
 delete require.cache[require.resolve('../lib/templateLibrary')];
 const tl2 = require('../lib/templateLibrary');
 const gated = tl2.renderer.render(t.id, { name: 'Ali' });
 assert(gated.ok === false && /approved/.test(gated.reason), 'render is blocked for non-approved template when gate is on');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all template-library checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
