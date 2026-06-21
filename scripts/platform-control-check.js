#!/usr/bin/env node
// scripts/platform-control-check.js — Validates Platform Control install + safe behaviour.
// No server, no external calls, no live actions. Read-only.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: String(d).slice(0, 80) });
const exists = (r) => fs.existsSync(path.join(ROOT, r));

const LIB = [
  'index.js', 'config.js', 'redactor.js', 'moduleRegistry.js', 'routeInventory.js', 'dashboardRegistry.js',
  'featureFlags.js', 'envReadinessScanner.js', 'secretPresenceChecker.js', 'whatsappReadiness.js',
  'cloudApiReadiness.js', 'aiProviderReadiness.js', 'ragReadiness.js', 'queueReadiness.js',
  'databaseReadiness.js', 'storageReadiness.js', 'integrationHealth.js', 'webhookReadiness.js',
  'campaignReadiness.js', 'templateReadiness.js', 'rateLimitReadiness.js', 'securityPosture.js',
  'safetyGuardReport.js', 'piiLeakScannerPreview.js', 'duplicateDetector.js', 'brokenReferenceScanner.js',
  'publicPageSafetyScanner.js', 'smokeTestInventory.js', 'packageScriptInventory.js', 'checkCommandInventory.js',
  'releaseReadinessScore.js', 'riskScore.js', 'logPreview.js', 'auditPreview.js', 'errorPatternPreview.js',
  'backupReadiness.js', 'deploymentChecklist.js', 'recommendationEngine.js',
];
LIB.forEach((f) => add(`file lib/platformControl/${f}`, exists(`lib/platformControl/${f}`)));
['routes/platformControlRoutes.js', 'public/platform-control.html', 'public/js/platform-control.js',
 'public/css/platform-control.css', 'scripts/platform-control-check.js', 'tests/smoke/platformControlSmoke.js',
 'docs/PLATFORM_CONTROL_OBSERVABILITY_SAFETY_OS.md'].forEach((f) => add(`file ${f}`, exists(f)));

add('server hook present', exists('server.js') && fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes('PLATFORM CONTROL HOOK'));

let leakBlob = '';
try {
  const pc = require('../lib/platformControl');
  const red = require('../lib/platformControl/redactor');
  require('../routes/platformControlRoutes');
  add('route module loads', true);

  const fns = ['getPlatformControlStatus', 'getPlatformSummary', 'getArchitecture', 'getArchitecturePreview', 'getSafety',
    'getModuleRegistry', 'getRouteInventory', 'getDashboardRegistry', 'getFeatureFlags', 'getPackageScripts', 'getCheckCommands',
    'getEnvReadiness', 'getSecretPresence', 'getWhatsAppReadiness', 'getCloudApiReadiness', 'getAiProviderReadiness',
    'getRagReadiness', 'getQueueReadiness', 'getDatabaseReadiness', 'getStorageReadiness', 'getIntegrationHealth',
    'getWebhookReadiness', 'getCampaignReadiness', 'getTemplateReadiness', 'getRateLimitReadiness', 'getSecurityPosture',
    'getBackupReadiness', 'getDeploymentChecklist', 'getSafetyGuardReport', 'getPiiLeakPreview', 'getDuplicateReport',
    'getBrokenReferences', 'getPublicPageSafety', 'getLogPreview', 'getAuditPreview', 'getErrorPatterns',
    'getReleaseReadinessScore', 'getRiskScore', 'getRecommendations',
    'getChecksPreview', 'runChecksPreview', 'getSmokeTestsPreview', 'runSmokeTestsPreview'];
  add('all API functions exported', fns.every((f) => typeof pc[f] === 'function'),
    fns.filter((f) => typeof pc[f] !== 'function').join(',') || 'all present');

  const status = pc.getPlatformControlStatus();
  add('status dryRun true', status.dryRun === true);
  add('status readOnly true', status.readOnly === true);
  add('status liveActionsEnabled false', status.liveActionsEnabled === false);
  add('status externalCallsEnabled false', status.externalCallsEnabled === false);
  add('status secretsExposed false', status.secretsExposed === false);
  add('status platformControlEnabled true', status.platformControlEnabled === true);

  // redactor checks
  add('redactor masks phone', red.maskPhone('+923001234567') === '+92******4567', red.maskPhone('+923001234567'));
  add('redactor masks email', /^us\*+@example\.com$/.test(red.maskEmail('user@example.com')), red.maskEmail('user@example.com'));
  add('redactor masks token', /_\*\*\*\*$/.test(red.maskToken('supersecrettoken')), red.maskToken('supersecrettoken'));
  add('redactor masks secret', /_\*\*\*\*$/.test(red.maskSecret('mysecret')), red.maskSecret('mysecret'));
  add('redactor masks path', !red.maskPath('/var/secret/app/data/file.json').startsWith('/'), red.maskPath('/var/secret/app/data/file.json'));
  add('redactor masks log message', red.redactLog({ message: 'call +923001234567 or a@b.com' }).message.includes('*'));
  add('redactor masks name', red.maskName('Abdul') === 'A***');
  add('redactor redactError hides stack', red.redactError(new Error('boom')).hasStack === false);
  add('redactor redactWebhookPayload hides values', red.redactWebhookPayload({ token: 'abc', to: '+923001234567' }).valuesExposed === false);
  add('redactor redactPackageScript flags danger', red.redactPackageScript('rm -rf /').dangerous === true);

  // architecture + new readiness scanners
  add('architecture preview shape', !!pc.getArchitecturePreview().architecturePreview);
  add('template readiness liveTemplateSyncEnabled false', pc.getTemplateReadiness().liveTemplateSyncEnabled === false);
  add('security posture secretsExposed false', pc.getSecurityPosture().secretsExposed === false);
  add('public page safety scan works', Array.isArray(pc.getPublicPageSafety().unsafePagesPreview));
  add('check commands inventory works', Array.isArray(pc.getCheckCommands().checkCommandsPreview));
  add('error patterns rawErrorsExposed false', pc.getErrorPatterns().rawErrorsExposed === false);

  // env readiness never exposes values
  const env = pc.getEnvReadiness();
  add('env readiness secretsExposed false', env.secretsExposed === false);
  add('env readiness exposes no secret value', red.hasLeak(env) === false);
  add('secret presence never exposes value', pc.getSecretPresence().secretPresencePreview.every((s) => /configured|not_configured/.test(s.valueMasked)));

  // readiness scanners do not enable live
  const wa = pc.getWhatsAppReadiness();
  add('whatsapp liveSendEnabled false', wa.liveSendEnabled === false);
  add('ai liveAiCallEnabled false', pc.getAiProviderReadiness().liveAiCallEnabled === false);
  add('queue liveQueueMutation false', pc.getQueueReadiness().liveQueueMutation === false);
  add('database no connection required', pc.getDatabaseReadiness().dbConnectionRequiredToStart === false);

  // scoring shapes
  add('release readiness has scorePreview number', typeof pc.getReleaseReadinessScore().scorePreview === 'number');
  add('risk score has riskScorePreview number', typeof pc.getRiskScore().riskScorePreview === 'number');

  // checks/smoke never execute
  add('checks run-preview does not execute', pc.runChecksPreview().executed === false && pc.runChecksPreview().liveScriptExecution === false);
  add('smoke run-preview does not execute', pc.runSmokeTestsPreview().executed === false);

  // aggregate leak scan over a sample of responses
  leakBlob = JSON.stringify([status, env, wa, pc.getLogPreview(), pc.getAuditPreview(), pc.getSummaryMaybe && pc.getSummaryMaybe()]);
  add('no leak in sampled responses', red.hasLeak([status, env, wa, pc.getLogPreview(), pc.getAuditPreview()]) === false);
} catch (e) {
  add('runtime checks executed', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, strict: String(process.env.PLATFORM_CONTROL_STRICT || 'false'), checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'platform_control_check.json'), JSON.stringify(out, null, 2));
let md = `# Platform Control Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? 'PASS' : 'FAIL'} | ${c.detail.replace(/\|/g, '/')} |\n`; });
fs.writeFileSync(path.join(dir, 'platform_control_check.md'), md);
console.log(md);
const strict = String(process.env.PLATFORM_CONTROL_STRICT || '').toLowerCase() === 'true';
process.exit((strict && failed > 0) ? 1 : 0);
