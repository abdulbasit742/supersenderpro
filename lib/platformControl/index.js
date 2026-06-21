// lib/platformControl/index.js
// Advanced Platform Control + Observability + Safety OS — unified read-only API surface.
// Every function returns dryRun/readOnly previews. No live actions, no external calls, no secret/PII exposure.
'use strict';

const cfg = require('./config');
const redactor = require('./redactor');

const moduleRegistry = require('./moduleRegistry');
const routeInventory = require('./routeInventory');
const dashboardRegistry = require('./dashboardRegistry');
const featureFlags = require('./featureFlags');
const packageScriptInventory = require('./packageScriptInventory');
const checkCommandInventory = require('./checkCommandInventory');
const envReadinessScanner = require('./envReadinessScanner');
const secretPresenceChecker = require('./secretPresenceChecker');
const whatsappReadiness = require('./whatsappReadiness');
const cloudApiReadiness = require('./cloudApiReadiness');
const aiProviderReadiness = require('./aiProviderReadiness');
const ragReadiness = require('./ragReadiness');
const queueReadiness = require('./queueReadiness');
const databaseReadiness = require('./databaseReadiness');
const storageReadiness = require('./storageReadiness');
const integrationHealth = require('./integrationHealth');
const webhookReadiness = require('./webhookReadiness');
const campaignReadiness = require('./campaignReadiness');
const templateReadiness = require('./templateReadiness');
const rateLimitReadiness = require('./rateLimitReadiness');
const securityPosture = require('./securityPosture');
const safetyGuardReport = require('./safetyGuardReport');
const piiLeakScannerPreview = require('./piiLeakScannerPreview');
const duplicateDetector = require('./duplicateDetector');
const brokenReferenceScanner = require('./brokenReferenceScanner');
const publicPageSafetyScanner = require('./publicPageSafetyScanner');
const smokeTestInventory = require('./smokeTestInventory');
const releaseReadinessScore = require('./releaseReadinessScore');
const riskScore = require('./riskScore');
const logPreview = require('./logPreview');
const auditPreview = require('./auditPreview');
const errorPatternPreview = require('./errorPatternPreview');
const backupReadiness = require('./backupReadiness');
const deploymentChecklist = require('./deploymentChecklist');
const recommendationEngine = require('./recommendationEngine');

const SUPPORTED_MODULES = [
  'modules', 'routes', 'dashboard-pages', 'feature-flags', 'package-scripts', 'check-commands',
  'env', 'secrets', 'whatsapp', 'whatsapp-cloud', 'ai', 'rag', 'queue', 'database', 'storage',
  'integrations', 'webhooks', 'campaigns', 'templates', 'rate-limits', 'security', 'backup', 'deployment',
  'pii-leak', 'duplicate-routes', 'duplicate-dashboard-links', 'broken-references', 'public-pages',
  'log-preview', 'audit-preview', 'error-patterns', 'release-readiness', 'risk', 'recommendations',
  'checks', 'smoke-tests',
];

function getPlatformControlStatus() {
  return cfg.safetyFlags({
    platformControlEnabled: true,
    feature: 'ADVANCED_PLATFORM_CONTROL_OBSERVABILITY_SAFETY_OS',
    version: '1.1.0-preview',
    supportedModules: SUPPORTED_MODULES,
    warnings: [],
    blockers: [],
  });
}

function getPlatformSummary() {
  const modules = moduleRegistry.getModuleRegistry();
  const routes = routeInventory.getRouteInventory();
  const pages = dashboardRegistry.getDashboardRegistry();
  const flags = featureFlags.getFeatureFlags();
  const scripts = packageScriptInventory.getPackageScripts();
  const release = releaseReadinessScore.getReleaseReadinessScore();
  const risk = riskScore.getRiskScore();
  const recs = recommendationEngine.getRecommendations();
  return cfg.safetyFlags({
    totalModulesPreview: modules.totalPreview,
    totalRoutesPreview: routes.totalPreview,
    totalDashboardPagesPreview: pages.totalPagesPreview,
    totalFeatureFlagsPreview: flags.totalPreview,
    totalPackageScriptsPreview: scripts.totalPreview,
    readinessScorePreview: release.scorePreview,
    riskScorePreview: risk.riskScorePreview,
    highRiskFindingsPreview: risk.riskSignalsPreview.length,
    recommendationsPreview: recs.recommendationsPreview.slice(0, 5),
    warnings: [],
    blockers: release.blockers,
  });
}

function getArchitecturePreview() {
  const det = (cond) => (cond ? 'detected_preview' : 'not_detected_preview');
  const integ = integrationHealth.getIntegrationHealth();
  return cfg.safetyFlags({
    architecturePreview: {
      backend: det(cfg.exists('server.js')),
      dashboard: det(cfg.exists('public/index.html')),
      storage: det(cfg.exists('data') || cfg.exists('lib/txnStore.js')),
      whatsapp: det(cfg.anyExists(cfg.HINTS.whatsappLocal) || cfg.anyExists(cfg.HINTS.whatsappCloud)),
      ai: det(cfg.anyExists(cfg.HINTS.ai)),
      queue: det(cfg.anyExists(cfg.HINTS.queue)),
      integrations: (integ.integrationsPreview || []).filter((i) => i.detectedPreview).map((i) => i.name),
    },
    designPrinciples: ['additive_only', 'read_only', 'preview_only', 'no_external_calls', 'pii_masked', 'secrets_never_exposed'],
    layout: {
      lib: 'lib/platformControl/* (read-only scanners + redactor)',
      routes: 'routes/platformControlRoutes.js (mounted at /api/platform-control)',
      dashboard: 'public/platform-control.html + js/css',
      scripts: 'scripts/platform-control-check.js',
      tests: 'tests/smoke/platformControlSmoke.js',
      docs: 'docs/PLATFORM_CONTROL_OBSERVABILITY_SAFETY_OS.md',
    },
    warnings: [], blockers: [],
  });
}

function getSafety() {
  return cfg.safetyFlags({
    guarantees: {
      liveActionsEnabled: false, externalCallsEnabled: false, secretsExposed: false,
      piiMasked: true, sendsDisabled: true, paymentsDisabled: true, aiLiveCallsDisabled: true,
      writeOperations: 'none', forcePush: false, historyRewrite: false,
    },
    warnings: [], blockers: [],
  });
}

function getReadinessOverview() {
  return cfg.safetyFlags({
    env: pick(envReadinessScanner.getEnvReadiness(), ['requiredKeysMissingPreview', 'optionalKeysMissingPreview']),
    whatsapp: pick(whatsappReadiness.getWhatsAppReadiness(), ['baileysReadyPreview', 'cloudApiReadyPreview']),
    ai: pick(aiProviderReadiness.getAiProviderReadiness(), ['configuredProvidersMaskedPreview', 'modulesReadyPreview']),
    queue: pick(queueReadiness.getQueueReadiness(), ['redisConfiguredPreview', 'inMemoryFallbackAvailablePreview']),
    database: pick(databaseReadiness.getDatabaseReadiness(), ['dbConfiguredPreview', 'jsonStorageDetectedPreview']),
    storage: pick(storageReadiness.getStorageReadiness(), ['writableHintPreview']),
    security: pick(securityPosture.getSecurityPosture(), ['publicSecretsRiskPreview', 'authRiskPreview']),
    warnings: [], blockers: [],
  });
}
function pick(obj, keys) { const o = {}; keys.forEach((k) => { o[k] = obj[k]; }); return o; }

function getChecksPreview() {
  const inv = checkCommandInventory.getCheckCommands();
  return cfg.safetyFlags({
    liveScriptExecution: false,
    checkPlanPreview: [
      'require all platformControl modules',
      'verify exported functions exist',
      'verify redactor masks phone/email/token/secret/path/log',
      'verify status returns dryRun/readOnly true and live flags false',
    ],
    safeCommandsPreview: ['node scripts/platform-control-check.js', 'node tests/smoke/platformControlSmoke.js'],
    skippedDangerousCommandsPreview: ['rm -rf', 'git reset --hard', 'git push -f', 'deploy:prod'],
    availableCheckCommandsPreview: (inv.checkCommandsPreview || []).map((c) => c.name),
    warnings: [], blockers: [],
  });
}

function runChecksPreview() {
  const plan = getChecksPreview();
  return cfg.safetyFlags({
    liveScriptExecution: false,
    executed: false,
    note: 'Preview only. No scripts were executed. Run the safe commands manually in CI/locally.',
    checkPlanPreview: plan.checkPlanPreview,
    safeCommandsPreview: plan.safeCommandsPreview,
    skippedDangerousCommandsPreview: plan.skippedDangerousCommandsPreview,
    warnings: [], blockers: [],
  });
}

function getSmokeTestsPreview() { return smokeTestInventory.getSmokeTestInventory(); }

function runSmokeTestsPreview() {
  const inv = smokeTestInventory.getSmokeTestInventory();
  return cfg.safetyFlags({
    liveScriptExecution: false,
    executed: false,
    note: 'Preview only. No smoke tests were executed.',
    smokePlanPreview: inv.smokeTestsPreview,
    safeCommandsPreview: ['npm run platform-control:smoke'],
    warnings: [], blockers: [],
  });
}

module.exports = {
  config: cfg,
  redactor,
  // core
  getPlatformControlStatus,
  getPlatformSummary,
  getArchitecture: getArchitecturePreview,
  getArchitecturePreview,
  getSafety,
  getReadinessOverview,
  // registries
  getModuleRegistry: moduleRegistry.getModuleRegistry,
  getRouteInventory: routeInventory.getRouteInventory,
  getDashboardRegistry: dashboardRegistry.getDashboardRegistry,
  getFeatureFlags: featureFlags.getFeatureFlags,
  getPackageScripts: packageScriptInventory.getPackageScripts,
  getCheckCommands: checkCommandInventory.getCheckCommands,
  // readiness
  getEnvReadiness: envReadinessScanner.getEnvReadiness,
  getSecretPresence: secretPresenceChecker.getSecretPresence,
  getWhatsAppReadiness: whatsappReadiness.getWhatsAppReadiness,
  getCloudApiReadiness: cloudApiReadiness.getCloudApiReadiness,
  getAiProviderReadiness: aiProviderReadiness.getAiProviderReadiness,
  getRagReadiness: ragReadiness.getRagReadiness,
  getQueueReadiness: queueReadiness.getQueueReadiness,
  getDatabaseReadiness: databaseReadiness.getDatabaseReadiness,
  getStorageReadiness: storageReadiness.getStorageReadiness,
  getIntegrationHealth: integrationHealth.getIntegrationHealth,
  getWebhookReadiness: webhookReadiness.getWebhookReadiness,
  getCampaignReadiness: campaignReadiness.getCampaignReadiness,
  getTemplateReadiness: templateReadiness.getTemplateReadiness,
  getRateLimitReadiness: rateLimitReadiness.getRateLimitReadiness,
  getSecurityPosture: securityPosture.getSecurityPosture,
  getBackupReadiness: backupReadiness.getBackupReadiness,
  getDeploymentChecklist: deploymentChecklist.getDeploymentChecklist,
  // safety / quality
  getSafetyGuardReport: safetyGuardReport.getSafetyGuardReport,
  getPiiLeakPreview: piiLeakScannerPreview.getPiiLeakPreview,
  getDuplicateReport: duplicateDetector.getDuplicateReport,
  getBrokenReferences: brokenReferenceScanner.getBrokenReferences,
  getPublicPageSafety: publicPageSafetyScanner.getPublicPageSafety,
  getLogPreview: logPreview.getLogPreview,
  getAuditPreview: auditPreview.getAuditPreview,
  getErrorPatterns: errorPatternPreview.getErrorPatterns,
  // scoring
  getReleaseReadinessScore: releaseReadinessScore.getReleaseReadinessScore,
  getRiskScore: riskScore.getRiskScore,
  getRecommendations: recommendationEngine.getRecommendations,
  // checks / smoke previews
  getChecksPreview, runChecksPreview, getSmokeTestsPreview, runSmokeTestsPreview,
};
