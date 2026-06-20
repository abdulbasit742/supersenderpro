#!/usr/bin/env node
// scripts/unified-setup-check.js — Validates the Unified Setup Wizard install and generates
// a sample readiness report. Never exposes secrets. Exit 0 unless UNIFIED_SETUP_STRICT=true
// and blockers exist.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const U = require('../lib/unifiedSetup');
const { hasLeak } = require('../lib/unifiedSetup/privacy');

const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// Structure checks
add('route module present', exists('routes/unifiedSetupRoutes.js'));
add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('UNIFIED SETUP WIZARD HOOK'));
add('dashboard page present', exists('public/unified-setup.html'));
add('dashboard js present', exists('public/js/unified-setup.js'));
add('dashboard css present', exists('public/css/unified-setup.css'));
add('env placeholders present', exists('.env.example') && fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8').includes('UNIFIED_SETUP_ENABLED'));
['UNIFIED_SETUP_WIZARD.md', 'TENANT_ONBOARDING_AUTOPILOT.md', 'BUSINESS_PRESETS.md', 'SETUP_CREDENTIAL_CHECKLIST.md', 'PILOT_LAUNCH_GUIDE.md']
  .forEach((d) => add(`doc ${d}`, exists(`docs/${d}`)));

// Functional checks
let report, plan, tasks;
try {
  U.businessProfile.upsert({ businessName: 'Sample Biz', businessType: 'ai_tools_reseller' });
  add('sample profile created', !!U.businessProfile.get());
  add('steps generated', U.stepEngine.allSteps().length >= 20);
  add('credential checklist built', U.credentialChecklist.build().length > 0);
  plan = U.autopilotPlanner.plan('ai_tools_reseller');
  add('autopilot plan generated', plan.recommendedPath.length > 0);
  report = U.readinessReport.build();
  add('readiness report generated', typeof report.score === 'number');
  tasks = U.onboardingTasks.generate();
  add('tasks generated', tasks.added >= 0);
} catch (e) {
  add('functional pipeline', false, e.message);
}

// Secret-leak check across the whole report
const blob = JSON.stringify({ report, plan, checklist: U.credentialChecklist.build() });
add('no secret values leaked', !hasLeak(blob) && !/[A-Za-z0-9]{32,}/.test(blob.replace(/(set|missing)/g, '')));

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length,
  readinessScore: report ? report.score : null, readinessStatus: report ? report.status : null,
  blockers: report ? report.blockers : [], checks };

const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'unified_setup_check.json'), JSON.stringify(out, null, 2));
let md = `# Unified Setup Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**`;
md += `\n\nReadiness: ${out.readinessScore} (${out.readinessStatus}) · blockers: ${out.blockers.length}\n\n`;
md += '| Check | Result | Detail |\n|---|---|---|\n';
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '✅' : '❌'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'unified_setup_check.md'), md);
console.log(md);

const strict = String(process.env.UNIFIED_SETUP_STRICT || '').toLowerCase() === 'true';
const hardFail = failed > 0 || (strict && report && report.blockers.length > 0);
process.exit(hardFail ? 1 : 0);
