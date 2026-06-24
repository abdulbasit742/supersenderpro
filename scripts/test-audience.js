'use strict';

/**
 * scripts/test-audience.js
 * Offline smoke test for spintax, templates, and contacts/segmentation,
 * plus the campaign integration (template body + segment recipients).
 * Runs fully offline. Exit 0 = pass, 1 = fail.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.CAMPAIGN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-aud-'));

const spintax = require('../lib/spintax');
const templates = require('../lib/templateStore');
const contacts = require('../lib/contactStore');
const { CampaignScheduler } = require('../lib/campaignScheduler');

let failures = 0;
function assert(c, m) { if (c) console.log('  \u2713 ' + m); else { console.error('  \u2717 ' + m); failures++; } }

(async () => {
  console.log('Audience (spintax/templates/contacts) smoke test');

  // ---- spintax ----
  const det = () => 0; // deterministic: always first option
  assert(spintax.expandSpintax('{a|b|c}', det) === 'a', 'spintax picks option');
  assert(spintax.expandSpintax('{Good {x|y}|Hi}', det) === 'Good x', 'spintax nesting');
  assert(spintax.applyVariables('Hi {{name}}', { name: 'Ali' }) === 'Hi Ali', 'variable substitution');
  assert(spintax.render('{{name}}: {a|b}', { name: 'Sara' }, det) === 'Sara: a', 'render combines vars+spintax');
  assert(JSON.stringify(spintax.extractVariables('{{a}} {{b}} {{a}}')) === JSON.stringify(['a', 'b']), 'extractVariables unique');
  assert(spintax.countVariants('{a|b}{c|d|e}') === 6, 'countVariants product');

  // ---- templates ----
  const t = templates.createTemplate({ name: 'Promo', body: 'Hi {{name}}, {offer|deal} 20% off!' });
  assert(t.id.startsWith('tpl_'), 'template created');
  assert(t.variables.includes('name'), 'template variables detected');
  assert(t.variants === 2, 'template variant count');
  const rendered = templates.renderTemplate(t.id, { name: 'Ali' });
  assert(/^Hi Ali, (offer|deal) 20% off!$/.test(rendered), 'template renders');
  assert(templates.updateTemplate(t.id, { name: 'Promo v2' }).name === 'Promo v2', 'template update');
  assert(templates.listTemplates().length === 1, 'template list');

  // ---- contacts ----
  contacts.upsertContact({ number: '92-300-1234567', name: 'Ali', tags: ['vip', 'lahore'] });
  contacts.upsertContact({ number: '923119876543', name: 'Sara', tags: ['lahore'] });
  contacts.upsertContact({ number: '923009998877', name: 'Bilal', tags: ['vip'] });
  assert(contacts.listContacts().length === 3, 'contacts added');
  assert(contacts.getContact(contacts.listContacts()[0].id).number === '923001234567', 'number normalized');
  assert(contacts.segment({ tags: ['vip'] }).length === 2, 'segment by any tag');
  assert(contacts.segment({ tags: ['vip', 'lahore'], match: 'all' }).length === 1, 'segment match=all');
  assert(contacts.tagCounts().find((x) => x.tag === 'lahore').count === 2, 'tag counts');

  // upsert merge (same number, new tag)
  contacts.upsertContact({ number: '923001234567', tags: ['returning'] });
  assert(contacts.segment({ tags: ['returning'] }).length === 1, 'upsert merges tags');

  // CSV import/export
  const imp = contacts.importCsv('number,name,tags\n923451112223,Zee,new|test\n');
  assert(imp.imported === 1, 'csv import');
  assert(contacts.exportCsv().split('\n')[0] === 'number,name,tags', 'csv export header');

  // recipients from segment
  const recs = contacts.toRecipients({ tags: ['vip'] });
  assert(recs.length === 2 && recs[0].to && recs[0].name !== undefined, 'segment -> recipients');

  // ---- integration: scheduler renders template body w/ spintax + vars ----
  const sched = new CampaignScheduler({ dryRun: true, logger: () => {} });
  const out = sched.render('Hi {name}, {{plan}} ready {x|x}', { name: 'Ali', to: '92300', attributes: { plan: 'Gold' } });
  assert(out === 'Hi Ali, Gold ready x', 'scheduler render: vars + legacy + spintax');
  sched.stop();

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
