#!/usr/bin/env node
// tests/smoke/whatsappCloudSetupSmoke.js — Offline smoke test. No external APIs, no sending, no live sync.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const results = [];
function check(n, fn) { try { results.push({ name: n, pass: true, detail: fn() || 'ok' }); } catch (e) { results.push({ name: n, pass: false, detail: e.message }); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); return true; }

// Isolated temp stores so the smoke test never writes runtime data.
process.env.WHATSAPP_CLOUD_SETUP_STORE_PATH = path.join(os.tmpdir(), 'wcs-smoke-config.json');
process.env.WHATSAPP_CLOUD_TEMPLATES_STORE_PATH = path.join(os.tmpdir(), 'wcs-smoke-templates.json');
try { fs.unlinkSync(process.env.WHATSAPP_CLOUD_TEMPLATES_STORE_PATH); } catch (_) {}
try { fs.unlinkSync(process.env.WHATSAPP_CLOUD_SETUP_STORE_PATH); } catch (_) {}

let setup, templates, tpl, prev, sp;
check('require setup wizard', () => { setup = require('../../lib/whatsappCloudSetup'); assert(setup.wizard, 'no wizard'); return 'ok'; });
check('require template manager', () => { templates = require('../../lib/whatsappCloudTemplates'); assert(templates.validator && templates.preview, 'missing'); return 'ok'; });
check('require route module', () => { require('../../routes/whatsappCloudSetupRoutes'); return 'loaded'; });

check('checklist has 14 steps', () => { const n = setup.checklist.getChecklist().length; assert(n === 14, `got ${n}`); return `${n} steps`; });
check('default sample templates seeded', () => { const ids = templates.store.ids(); assert(ids.length >= 3, 'need >=3'); return `${ids.length} templates`; });

check('validate sample utility template', () => {
  tpl = templates.store.get('wct_sample_order_update');
  assert(tpl && tpl.category === 'utility', 'missing utility sample');
  assert(templates.validator.validate(tpl).ok === true, 'invalid');
  return 'valid';
});
check('render template preview', () => { prev = templates.preview.render(tpl, {}); assert(prev.ok && prev.renderedPreview.length > 0, 'no preview'); return prev.renderedPreview; });
check('quality assessment returns rating', () => { const q = templates.quality.assess(tpl); assert(['GREEN', 'YELLOW', 'RED'].includes(q.qualityRating), 'bad rating'); return q.qualityRating; });

check('send preview dryRun true', () => { sp = setup.sendPreview.sendPreview({ templateId: tpl.id, recipient: '+923001234567' }); assert(sp.dryRun === true, 'not dry-run'); return 'dryRun=true'; });
check('send preview liveSend false', () => { assert(sp.liveSend === false, 'live send enabled'); return 'liveSend=false'; });
check('recipient masked (no full number)', () => { assert(sp.recipientMasked.includes('•') && !/\d{10,}/.test(sp.recipientMasked), 'phone leaked'); return sp.recipientMasked; });

check('sync preview performs no live call', () => { const s = templates.syncPreview.syncPreview(); assert(s.liveSyncPerformed === false, 'live sync ran'); return 'no-live-call'; });
check('webhook helper hides token value', () => { const wh = setup.webhookVerifier.webhookInfo(); assert(wh.verifyTokenEnvVar === 'WHATSAPP_CLOUD_VERIFY_TOKEN' && wh.value === undefined, 'token exposed'); return 'hidden'; });

check('no token/phone/email leaks', () => {
  const blob = JSON.stringify({ status: setup.wizard.getStatus(), report: templates.report(), sp, readiness: setup.wizard.getReadiness(templates.store.all()) });
  assert(!setup.redactor.hasLeak(blob), 'leak detected');
  return 'clean';
});

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: results.length, results };
const dir = path.join(__dirname, '..', '..', 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'whatsapp_cloud_setup_smoke.json'), JSON.stringify(out, null, 2));
let md = `# WhatsApp Cloud Setup Smoke Test\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${results.length} passed**`;
md += failed ? ` — ${failed} FAILED\n\n` : ' — all passed ✅\n\n';
md += '| # | Check | Result | Detail |\n|---|---|---|---|\n';
results.forEach((r, i) => { md += `| ${i + 1} | ${r.name} | ${r.pass ? '✅' : '❌ FAIL'} | ${String(r.detail).replace(/\|/g, '/').slice(0, 70)} |\n`; });
fs.writeFileSync(path.join(dir, 'whatsapp_cloud_setup_smoke.md'), md);
console.log(md);
process.exit(failed === 0 ? 0 : 1);
