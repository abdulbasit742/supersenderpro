// lib/platformControl/index.js — aggregator: status, summary, architecture + re-exports.
  'use strict';
  const cfg = require('./config');
  const { moduleRegistry } = require('./moduleRegistry');
  const { routeInventory } = require('./routeInventory');
  const { dashboardRegistry } = require('./dashboardRegistry');
  const { featureFlags } = require('./featureFlags');
  const { packageScriptInventory } = require('./packageScriptInventory');
  const { releaseReadinessScore } = require('./releaseReadinessScore');
  const { riskScore } = require('./riskScore');
  const { recommendationEngine } = require('./recommendationEngine');
  const { safetyGuardReport } = require('./safetyGuardReport');
  const { whatsappReadiness } = require('./whatsappReadiness');
  const { aiProviderReadiness } = require('./aiProviderReadiness');
  const { queueReadiness } = require('./queueReadiness');
  const { databaseReadiness } = require('./databaseReadiness');
  const { integrationHealth } = require('./integrationHealth');


  const SUPPORTED_MODULES = [
       'system_overview', 'architecture_summary', 'module_registry', 'route_inventory', 'dashboard_registry',
       'feature_flags', 'package_scripts', 'env_readiness', 'secret_presence', 'whatsapp_readiness',
       'cloud_api_readiness', 'webhook_readiness', 'campaign_readiness', 'template_readiness', 'ai_readiness',
       'rag_readiness', 'queue_readiness', 'database_readiness', 'storage_readiness', 'integration_health',
       'rate_limit_readiness', 'security_posture', 'safety_guard', 'pii_leak_preview', 'duplicate_routes',
       'duplicate_dashboard_links', 'broken_references', 'public_page_safety', 'log_preview', 'audit_preview',
       'error_patterns', 'backup_readiness', 'deployment_checklist', 'smoke_test_inventory', 'check_commands',
       'release_readiness_score', 'risk_score', 'recommendations', 'command_center_ui',
  ];


  function getPlatformControlStatus() {
    const guard = safetyGuardReport();
    return cfg.base({ platformControlEnabled: true, supportedModules: SUPPORTED_MODULES, warnings: guard.warnings,
  blockers: guard.blockers });
  }


  function getPlatformSummary() {
    const mods = moduleRegistry();
       const routes = routeInventory();
       const dash = dashboardRegistry();
       const flags = featureFlags();
       const scripts = packageScriptInventory();
       const release = releaseReadinessScore();
       const risk = riskScore();
       const recs = recommendationEngine();
       const guard = safetyGuardReport();
       return cfg.base({
         totalModulesPreview: mods.modulesPreview.length,
        totalRoutesPreview: routes.routesPreview.length,
        totalDashboardPagesPreview: dash.pagesPreview.length,
        totalFeatureFlagsPreview: flags.flagsPreview.length,
        totalPackageScriptsPreview: scripts.scriptsPreview.length,
        readinessScorePreview: release.scorePreview,

       riskScorePreview: risk.riskScorePreview,
       highRiskFindingsPreview: risk.riskSignalsPreview.filter((s) => s.weight >= 20).length,
       recommendationsPreview: recs.recommendationsPreview.slice(0, 5),
       warnings: guard.warnings,
       blockers: guard.blockers,
     });
 }


 function getArchitecturePreview() {
     const db = databaseReadiness();
     const wa = whatsappReadiness();
     const ai = aiProviderReadiness();
     const queue = queueReadiness();
     const integrations = integrationHealth().integrationsPreview.filter((i) => i.detectedPreview).map((i) => i.name);
     return cfg.base({
       architecturePreview: {
         backend: (cfg.exists('server.js') || cfg.exists('app.js')) ? 'express_detected_preview' : 'unknown_preview',
           dashboard: cfg.exists('public') ? 'static_public_detected_preview' : 'unknown_preview',
           storage: db.jsonStorageDetectedPreview ? 'json_file_preview' : (db.dbConfiguredPreview ? 'database_preview' :
 'unknown_preview'),
       whatsapp: (wa.baileysReadyPreview || wa.cloudApiReadyPreview) ? 'detected_preview' : 'not_detected_preview',
           ai: ai.configuredProvidersMaskedPreview.length ? 'detected_preview' : 'not_detected_preview',
           queue: queue.queueAdapterAvailablePreview ? 'detected_preview' : 'in_memory_fallback_preview',
           integrations,
       },
     });
 }


 module.exports = { getPlatformControlStatus, getPlatformSummary, getArchitecturePreview, SUPPORTED_MODULES };
