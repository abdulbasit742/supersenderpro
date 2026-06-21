 'use strict';
 /**
     * manifestBuilder.js — assembles the full Gumloop handoff manifest from the
     * classifier + scanners + maps. Never includes secret values or full PII; only
     * redacted previews. Pure (no filesystem writes); the check script persists it.

*/
const { emptyManifest } = require('./handoffManifest');
const fileClassifier = require('./fileClassifier');
const mergeRiskScanner = require('./mergeRiskScanner');
const routeMountMap = require('./routeMountMap');
const dashboardLinkMap = require('./dashboardLinkMap');
const packageScriptMap = require('./packageScriptMap');
const copySafetyScanner = require('./copySafetyScanner');

const CREATED_FILES = [
'lib/gumloopHandoff/index.js',
   'lib/gumloopHandoff/pathSafety.js',
   'lib/gumloopHandoff/safeCopyRules.js',
   'lib/gumloopHandoff/fileClassifier.js',
   'lib/gumloopHandoff/redactor.js',
   'lib/gumloopHandoff/mergeRiskScanner.js',
   'lib/gumloopHandoff/routeMountMap.js',
   'lib/gumloopHandoff/dashboardLinkMap.js',
   'lib/gumloopHandoff/packageScriptMap.js',
   'lib/gumloopHandoff/copySafetyScanner.js',
   'lib/gumloopHandoff/handoffManifest.js',
   'lib/gumloopHandoff/manifestBuilder.js',
   'routes/gumloopHandoffRoutes.js',
   'public/gumloop-handoff.html',
   'public/js/gumloop-handoff.js',
   'public/css/gumloop-handoff.css',
   'scripts/gumloop-handoff-check.js',
   'tests/smoke/gumloopHandoffSmoke.js',
   'docs/GUMLOOP_IMPORT_PLAN.md',
   'docs/GUMLOOP_PUSH_LATER_RUNBOOK.md',
   'docs/CLICKUP_TO_GUMLOOP_HANDOFF.md',
   'docs/MANUAL_ZIP_TO_VSCODE_TO_GUMLOOP.md',
   'docs/GUMLOOP_HANDOFF_GAP_REPORT.md',
   'docs/GUMLOOP_HANDOFF_DELIVERY_REPORT.md',
];

const MODIFIED_VIA_HOOK = [
   'server.js', 'public/index.html', 'package.json', '.env.example', '.gitignore',
];


const ENV_PLACEHOLDERS = [
   'GUMLOOP_HANDOFF_ENABLED', 'GUMLOOP_HANDOFF_DRY_RUN', 'GUMLOOP_HANDOFF_NO_COMMIT',
   'GUMLOOP_HANDOFF_NO_PUSH', 'GUMLOOP_HANDOFF_REDACT_PII', 'GUMLOOP_HANDOFF_REDACT_SECRETS',
   'GUMLOOP_HANDOFF_EXCLUDE_RUNTIME_DATA', 'GUMLOOP_HANDOFF_STRICT',
];

const GITIGNORE_PROTECTIONS = [
   '.env', '.env.*', 'node_modules/', 'logs/', 'uploads/', 'data/*.json', 'data/**/*.json',
   'sessions/', '.wa-auth/', '.baileys-auth/', 'baileys_auth*/', 'browser-cache/',
   'private-backups/', 'exports/', '*.zip', 'artifacts/*raw*', 'artifacts/*private*',
   '*token*', '*secret*', '*.pem', '*.key',
];

const VALIDATION_COMMANDS = [
'node --check server.js',
   'node --check routes/gumloopHandoffRoutes.js',
   'node --check lib/gumloopHandoff/index.js',

   'node --check lib/gumloopHandoff/fileClassifier.js',
   'node --check lib/gumloopHandoff/manifestBuilder.js',
   'node --check lib/gumloopHandoff/mergeRiskScanner.js',
   'node --check scripts/gumloop-handoff-check.js',
   'node --check tests/smoke/gumloopHandoffSmoke.js',
   'npm run gumloop-handoff:check',
   'npm run gumloop-handoff:smoke',
];

const GUMLOOP_NEXT_STEPS = [
'git checkout main',
   'git pull origin main',
   'Import safe files only (see safeToCopy).',
   'Never copy .env/data/logs/uploads/sessions/node_modules.',
   'Verify route mounts (BEGIN/END GUMLOOP HANDOFF HOOK).',
   'Verify dashboard link present.',
   'Run node --check on changed files.',
   'Run npm run gumloop-handoff:check && :smoke.',
   'Stage only safe files.',
   'Commit.',
   'git pull --rebase origin main.',
   'Push to main. If blocked, open PR. No force push.',
];

function build(ctx) {
   ctx = ctx || {};
   const m = emptyManifest(ctx.workspaceName);


   const classified = fileClassifier.classifyMany(ctx.files || []);
   m.safeToCopy = classified.safeToCopy.map((x) => x.path);
   m.neverCopy = classified.neverCopy.map((x) => x.path);
   m.unknownReview = classified.unknownReview.map((x) => ({ path: x.path, markers: x.markers }));


   m.createdFiles = CREATED_FILES.slice();
   m.modifiedFiles = MODIFIED_VIA_HOOK.map((f) => ({ file: f, change: 'append-only hook block' }));

   m.routeMounts = routeMountMap.build(ctx.serverJsText || '', ctx.presentFiles || []).routes;
   m.dashboardLinks = dashboardLinkMap.build(ctx.indexHtmlText || '', ctx.presentFiles || []).pages;
   m.packageScripts = packageScriptMap.build(ctx.packageJson || {}, ctx.presentFiles || []).scripts;


   m.envPlaceholders = ENV_PLACEHOLDERS.slice();
   m.gitignoreProtections = GITIGNORE_PROTECTIONS.slice();

   m.docs = CREATED_FILES.filter((f) => f.startsWith('docs/'));
   m.checkScripts = ['scripts/gumloop-handoff-check.js'];
   m.smokeTests = ['tests/smoke/gumloopHandoffSmoke.js'];
   m.reports = [
    'artifacts/gumloop_handoff_inventory.json', 'artifacts/gumloop_handoff_inventory.md',
    'artifacts/gumloop_handoff_manifest.json', 'artifacts/gumloop_handoff_manifest.md',
    'artifacts/gumloop_merge_risk_report.json', 'artifacts/gumloop_merge_risk_report.md',
    'artifacts/gumloop_route_mount_map.json', 'artifacts/gumloop_route_mount_map.md',
    'artifacts/gumloop_dashboard_link_map.json', 'artifacts/gumloop_dashboard_link_map.md',
    'artifacts/gumloop_package_script_map.json', 'artifacts/gumloop_package_script_map.md',
    'artifacts/gumloop_copy_safety_scan.json', 'artifacts/gumloop_copy_safety_scan.md',
    'artifacts/gumloop_handoff_check.json', 'artifacts/gumloop_handoff_check.md',
    'artifacts/gumloop_handoff_smoke.json', 'artifacts/gumloop_handoff_smoke.md',
    'artifacts/gumloop_handoff_delivery_report.json', 'artifacts/gumloop_handoff_delivery_report.md',

  ];


  const merge = mergeRiskScanner.scan(ctx.fileMap || {});
  m.mergeRisks = merge.risks;


  const safety = copySafetyScanner.scan(ctx.safeSourceFiles || []);
  m.blockers = safety.blockers.slice();
if (safety.totalPiiFindings > 0) m.warnings.push({ type: 'pii_preview', count: safety.totalPiiFindings, note: 'Redacted previews only; review demo/sample files.' });


  m.validationCommands = VALIDATION_COMMANDS.slice();
  m.gumloopNextSteps = GUMLOOP_NEXT_STEPS.slice();
  return m;
}


module.exports = { build, CREATED_FILES, MODIFIED_VIA_HOOK, ENV_PLACEHOLDERS, GITIGNORE_PROTECTIONS, VALIDATION_COMMANDS,
GUMLOOP_NEXT_STEPS };
