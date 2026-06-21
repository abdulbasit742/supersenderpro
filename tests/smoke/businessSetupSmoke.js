const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ARTIFACTS = process.env.BUSINESS_SETUP_ARTIFACTS_DIR || path.join(ROOT, 'artifacts');
const STRICT = String(process.env.BUSINESS_SETUP_STRICT || 'false') === 'true';

process.env.BUSINESS_SETUP_STORE_PATH = 'data/.bs-smoke-store.json';
process.env.BUSINESS_SETUP_PROFILE_PATH = 'data/.bs-smoke-profile.json';
process.env.BUSINESS_SETUP_HISTORY_PATH = 'data/.bs-smoke-history.json';

const results = [];
const t = (name, cond, detail) => { const status = cond ? 'pass' : 'fail'; results.push({ name, status, detail: detail ||
'' }); console.log(` [${status.toUpperCase()}] ${name}${detail ? ' - ' + detail : ''}`); };

function run() {
  console.log('Business Setup smoke tests');
  let store, profileManager, registry, applier, checklist, readiness;
  try {
    store = require('../../lib/businessSetup/store');
    profileManager = require('../../lib/businessSetup/profileManager');
    registry = require('../../lib/businessSetup/presetRegistry');
    applier = require('../../lib/businessSetup/presetApplier');
    checklist = require('../../lib/businessSetup/setupChecklist');
    readiness = require('../../lib/businessSetup/readinessScoring');
    t('require modules', true);
  } catch (e) { t('require modules', false, e.message); return finish(); }

  try { store.saveState(store.emptyState()); store.saveProfile(null); } catch {}

  const presets = registry.list();
  t('list presets', Array.isArray(presets) && presets.length >= 10, presets.length + ' presets');

  // apply AI tools reseller
  let a1;
  try { a1 = applier.apply({ presetId: 'ai_tools_reseller', businessType: 'ai_tools_reseller', profile: { businessName:
'Reseller X', ownerPhone: '+1 555 010 2345' } }); t('apply ai_tools_reseller', !!a1); }
  catch (e) { t('apply ai_tools_reseller', false, e.message); }
  t('reseller dryRun true', a1 && a1.dryRun === true);
  t('reseller has modules', a1 && Array.isArray(a1.recommendedModules) && a1.recommendedModules.length > 0);
  t('reseller has checklist', a1 && Array.isArray(a1.checklist) && a1.checklist.length > 0, a1 ? a1.checklist.length + ' items' : '');

   // apply ecommerce
   let a2;
 try { a2 = applier.apply({ presetId: 'ecommerce_store', businessType: 'ecommerce_store' }); t('apply ecommerce_store',
!!a2); }
   catch (e) { t('apply ecommerce_store', false, e.message); }
   t('ecommerce dryRun true', a2 && a2.dryRun === true);

   // checklist + readiness
   const items = checklist.list();
   t('checklist generated', items.length > 0, items.length + ' items');
   const r = readiness.run();
   t('readiness computed', r && typeof r.score === 'number', r ? (r.score + ' ' + r.band) : '');

   // PII leak checks
   const blob = JSON.stringify({ a1, a2, profile: profileManager.get() });
   t('no full phone leak', !/\b\d{10,15}\b/.test(blob), 'masked');
   t('no email leak', !/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob), 'masked');
   t('no token leak', !/(bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9]{16,})/i.test(blob), 'clean');


   finish();
}


function finish() {
 const pass = results.filter((r) => r.status === 'pass').length;
   const fail = results.filter((r) => r.status === 'fail').length;
   const report = { generatedAt: new Date().toISOString(), pass, fail, results };
   try { fs.mkdirSync(ARTIFACTS, { recursive: true }); } catch {}
   fs.writeFileSync(path.join(ARTIFACTS, 'business_setup_smoke.json'), JSON.stringify(report, null, 2));
   fs.writeFileSync(path.join(ARTIFACTS, 'business_setup_smoke.md'), '# Business Setup — Smoke Pass ' + pass + ' · Fail ' + fail + '' + results.map((r) => `- [${r.status}] ${r.name} ${r.detail}`).join('') + '');
 console.log(`Result: ${pass} pass, ${fail} fail`);
 ['data/.bs-smoke-store.json','data/.bs-smoke-profile.json','data/.bs-smoke-history.json'].forEach((f) => { try {
fs.unlinkSync(path.join(ROOT, f)); } catch {} });
   process.exit(STRICT && fail > 0 ? 1 : 0);
}

run();
