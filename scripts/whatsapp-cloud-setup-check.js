#!/usr/bin/env node
// scripts/whatsapp-cloud-setup-check.js — Validates WhatsApp Cloud Setup + Template Manager install.
// No external API calls. No live sends. No token output. Exits 0 unless WHATSAPP_CLOUD_SETUP_STRICT=true and failures exist.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

// Use isolated temp data files so the check never pollutes runtime data.
process.env.WHATSAPP_CLOUD_SETUP_STORE_PATH = process.env.WHATSAPP_CLOUD_SETUP_STORE_PATH || path.join(require('os').tmpdir(), 'wcs-check-config.json');
process.env.WHATSAPP_CLOUD_TEMPLATES_STORE_PATH = process.env.WHATSAPP_CLOUD_TEMPLATES_STORE_PATH || path.join(require('os').tmpdir(), 'wcs-check-templates.json');

// 1. Files
[
  'lib/whatsappCloudSetup/store.js', 'lib/whatsappCloudSetup/configModel.js', 'lib/whatsappCloudSetup/setupChecklist.js',
  'lib/whatsappCloudSetup/redactor.js', 'lib/whatsappCloudSetup/safety.js', 'lib/whatsappCloudSetup/setupWizard.js',
  'lib/whatsappCloudSetup/setupValidator.js', 'lib/whatsappCloudSetup/readinessScoring.js', 'lib/whatsappCloudSetup/webhookVerifier.js',
  'lib/whatsappCloudSetup/sendPreview.js', 'lib/whatsappCloudSetup/index.js',
  'lib/whatsappCloudTemplates/templateStore.js', 'lib/whatsappCloudTemplates/templateModel.js', 'lib/whatsappCloudTemplates/templateValidator.js',
  'lib/whatsappCloudTemplates/templateCatalog.js', 'lib/whatsappCloudTemplates/templatePreview.js', 'lib/whatsappCloudTemplates/templateQuality.js',
  'lib/whatsappCloudTemplates/templateSyncPreview.js', 'lib/whatsappCloudTemplates/index.js',
  'routes/whatsappCloudSetupRoutes.js',
  'public/whatsapp-cloud-setup.html', 'public/js/whatsapp-cloud-setup.js', 'public/css/whatsapp-cloud-setup.css',
].forEach((f) => add(`file ${f}`, exists(f)));

// 2. Server hook + env + gitignore + docs
add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('WHATSAPP CLOUD SETUP HOOK'));
add('env placeholders present', exists('.env.example') && fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8').includes('WHATSAPP_CLOUD_SETUP_ENABLED'));
add('gitignore protects data', exists('.gitignore') && fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').includes('whatsapp-cloud*.json'));
['WHATSAPP_CLOUD_SETUP.md', 'WHATSAPP_TEMPLATE_MANAGER.md', 'WHATSAPP_WEBHOOK_VERIFICATION.md', 'WHATSAPP_CLOUD_PRODUCTION_CHECKLIST.md', 'WHATSAPP_CLOUD_SETUP_GAP_REPORT.md']
  .forEach((d) => add(`doc ${d}`, exists(`docs/${d}`)));

// 3. Functional pipeline
let readiness;
try {
  const setup = require('../lib/whatsappCloudSetup');
  const templates = require('../lib/whatsappCloudTemplates');

  add('route module loads', !!require('../routes/whatsappCloudSetupRoutes'));
  add('safety dry-run by default', setup.flags.dryRun === true && setup.flags.liveSend === false);
  add('checklist has 14 items', setup.checklist.getChecklist().length === 14, `${setup.checklist.getChecklist().length} items`);

  const tpl = templates.store.upsert({ name: 'check_sample_utility', category: 'utility', body: 'Hi {{name}}, order {{id}} is {{status}}.', sampleValues: { name: 'A', id: '1', status: 'ok' }, footer: 'SSP' });
  add('create sample template', !!tpl && tpl.id.startsWith('wct_'));
  add('validate sample template', templates.validator.validate(tpl).ok === true);
  const prev = templates.preview.render(tpl, {});
  add('render preview (no missing vars)', prev.ok === true && prev.missingVariables.length === 0, prev.renderedPreview);
  add('quality assessment', ['GREEN', 'YELLOW', 'RED'].includes(templates.quality.assess(tpl).qualityRating));

  const sync = templates.syncPreview.syncPreview();
  add('sync preview no live call', sync.ok === true && sync.liveSyncPerformed === false);

  const sp = setup.sendPreview.sendPreview({ templateId: tpl.id, recipient: '+923001234567' });
  add('send preview dry-run + masked + no live send', sp.dryRun === true && sp.liveSend === false && sp.recipientMasked.includes('•'));

  const wh = setup.webhookVerifier.webhookInfo();
  add('webhook helper exposes env var name not value', wh.verifyTokenEnvVar === 'WHATSAPP_CLOUD_VERIFY_TOKEN');

  readiness = setup.wizard.getReadiness(templates.store.all()).readiness;
  add('readiness score computed', typeof readiness.score === 'number');

  const blob = JSON.stringify({ status: setup.wizard.getStatus(), report: templates.report(), sp, readiness });
  add('no secret/PII leak', !setup.redactor.hasLeak(blob));
} catch (e) {
  add('functional pipeline', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, readinessScore: readiness ? readiness.score : null, strict: String(process.env.WHATSAPP_CLOUD_SETUP_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'whatsapp_cloud_setup_check.json'), JSON.stringify(out, null, 2));
let md = `# WhatsApp Cloud Setup Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'whatsapp_cloud_setup_check.md'), md);
console.log(md);
const strict = String(process.env.WHATSAPP_CLOUD_SETUP_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
