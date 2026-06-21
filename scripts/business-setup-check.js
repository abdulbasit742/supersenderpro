const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ARTIFACTS = process.env.BUSINESS_SETUP_ARTIFACTS_DIR || path.join(ROOT, 'artifacts');
const STRICT = String(process.env.BUSINESS_SETUP_STRICT || 'false') === 'true';

process.env.BUSINESS_SETUP_STORE_PATH = process.env.BUSINESS_SETUP_STORE_PATH || 'data/.bs-check-store.json';
process.env.BUSINESS_SETUP_PROFILE_PATH = process.env.BUSINESS_SETUP_PROFILE_PATH || 'data/.bs-check-profile.json';
process.env.BUSINESS_SETUP_HISTORY_PATH = process.env.BUSINESS_SETUP_HISTORY_PATH || 'data/.bs-check-history.json';

const abs = (p) => path.join(ROOT, p);
const exists = (p) => { try { fs.accessSync(abs(p)); return true; } catch { return false; } };
const read = (p) => { try { return fs.readFileSync(abs(p), 'utf8'); } catch { return ''; } };

const FILES = [
  'lib/businessSetup/store.js', 'lib/businessSetup/profileManager.js',
  'lib/businessSetup/presetRegistry.js', 'lib/businessSetup/industryPresets.js',
  'lib/businessSetup/presetApplier.js', 'lib/businessSetup/setupChecklist.js',
  'lib/businessSetup/readinessScoring.js', 'lib/businessSetup/safetyGuard.js',
  'routes/businessSetupRoutes.js', 'public/business-setup.html',
  'public/js/business-setup.js', 'public/css/business-setup.css',
];
const DOCS = ['docs/BUSINESS_SETUP_WIZARD.md', 'docs/BUSINESS_PRESETS.md', 'docs/BUSINESS_SETUP_READINESS.md',
'docs/BUSINESS_SETUP_SAFETY.md'];

const results = [];
const add = (check, status, detail) => results.push({ check, status, detail: detail || '' });

function main() {
  FILES.forEach((f) => add('file:' + f, exists(f) ? 'pass' : 'fail', exists(f) ? 'present' : 'missing'));
  DOCS.forEach((f) => add('doc:' + f, exists(f) ? 'pass' : 'warn', exists(f) ? 'present' : 'missing'));

  const server = read('server.js');
  add('wiring:route_mount', /app\.use\(\s*['"]\/api\/business-setup['"]/.test(server) ? 'pass' : 'warn');
  add('wiring:dashboard_link', read('public/index.html').includes('business-setup.html') ? 'pass' : 'warn');
  add('env:placeholders', /BUSINESS_SETUP_DRY_RUN/.test(read('.env.example')) ? 'pass' : 'warn');
  const pkg = read('package.json');
  add('pkg:check_script', /business-setup:check/.test(pkg) ? 'pass' : 'warn');
  add('pkg:smoke_script', /business-setup:smoke/.test(pkg) ? 'pass' : 'warn');

  let applier, readiness, profileManager;

   try {
     applier = require('../lib/businessSetup/presetApplier');
     readiness = require('../lib/businessSetup/readinessScoring');
     profileManager = require('../lib/businessSetup/profileManager');
     add('load:modules', 'pass');
   } catch (e) { add('load:modules', 'fail', e.message); return finish(); }


   try {
     profileManager.create({ businessName: 'Check Biz', businessType: 'ai_tools_reseller', ownerPhone: '+1 555 123 4567'
});
     const applied = applier.apply({ presetId: 'ai_tools_reseller' });
     add('apply:dry_run', applied.dryRun === true ? 'pass' : 'fail');
     add('apply:checklist_built', Array.isArray(applied.checklist) && applied.checklist.length > 0 ? 'pass' : 'fail',
applied.checklist.length + ' items');
   const blob = JSON.stringify(applied);
     add('apply:no_pii_leak', /\b\d{10,15}\b/.test(blob) ? 'fail' : 'pass', 'phone masked');
     const r = readiness.run();
     add('readiness:band', r && r.band ? 'pass' : 'fail', r ? (r.score + ' ' + r.band) : '');
   } catch (e) { add('apply:run', 'fail', e.message); }


   finish();
}


function finish() {
 const pass = results.filter((r) => r.status === 'pass').length;
   const fail = results.filter((r) => r.status === 'fail').length;
   const warn = results.filter((r) => r.status === 'warn').length;
   const report = { generatedAt: new Date().toISOString(), pass, fail, warn, results };
   try { fs.mkdirSync(ARTIFACTS, { recursive: true }); } catch {}
   fs.writeFileSync(path.join(ARTIFACTS, 'business_setup_check.json'), JSON.stringify(report, null, 2));
   fs.writeFileSync(path.join(ARTIFACTS, 'business_setup_check.md'), '# Business Setup — Check Pass ' + pass + ' · Fail ' + fail + ' · Warn ' + warn + '' + results.map((r) => `- [${r.status}] ${r.check} ${r.detail}`).join('') + '');
   console.log(`Business Setup check: ${pass} pass, ${fail} fail, ${warn} warn`);
   results.forEach((r) => console.log(` [${r.status.toUpperCase()}] ${r.check} ${r.detail ? '- ' + r.detail : ''}`));
 ['data/.bs-check-store.json','data/.bs-check-profile.json','data/.bs-check-history.json'].forEach((f) => { try {
fs.unlinkSync(abs(f)); } catch {} });
   process.exit(STRICT && fail > 0 ? 1 : 0);
}


main();
