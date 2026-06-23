// routes/platformControlRoutes.js
// Express router for Advanced Platform Control + Observability + Safety OS.
// Mounted at /api/platform-control. READ-ONLY / PREVIEW-ONLY:
// no live actions, no external calls, no sends, no payments, no live AI, no secret/PII exposure, no stack traces.
'use strict';

const express = require('express');
const router = express.Router();

const pc = require('../lib/platformControl');
const { hasLeak } = require('../lib/platformControl/redactor');

// Wrap every handler: never throw raw errors, never leak PII/secrets/stack traces.
function safe(fn) {
  return (req, res) => {
    try {
      const out = fn(req, res);
      if (out !== undefined && !res.headersSent) {
        if (hasLeak(out)) {
          return res.status(500).json({ ok: false, dryRun: true, readOnly: true, liveActionsEnabled: false,
            secretsExposed: false, error: 'response_blocked_possible_leak' });
        }
        res.json(out);
      }
    } catch (e) {
      // Never expose stack traces.
      res.status(200).json({ ok: false, dryRun: true, readOnly: true, liveActionsEnabled: false,
        externalCallsEnabled: false, secretsExposed: false, error: 'preview_error',
        warnings: ['handler_error_suppressed'], blockers: [] });
    }
  };
}

/* ---- Core ---- */
router.get('/status', safe(() => pc.getPlatformControlStatus()));
router.get('/summary', safe(() => pc.getPlatformSummary()));
router.get('/architecture', safe(() => pc.getArchitecture()));
router.get('/safety', safe(() => pc.getSafety()));

/* ---- Registry ---- */
router.get('/modules', safe(() => pc.getModuleRegistry()));
router.get('/routes', safe(() => pc.getRouteInventory()));
router.get('/dashboard-pages', safe(() => pc.getDashboardRegistry()));
router.get('/feature-flags', safe(() => pc.getFeatureFlags()));
router.get('/package-scripts', safe(() => pc.getPackageScripts()));
router.get('/check-commands', safe(() => pc.getCheckCommands()));

/* ---- Readiness ---- */
router.get('/readiness', safe(() => pc.getReadinessOverview()));
router.get('/readiness/env', safe(() => pc.getEnvReadiness()));
router.get('/readiness/secrets', safe(() => pc.getSecretPresence()));
router.get('/readiness/whatsapp', safe(() => pc.getWhatsAppReadiness()));
router.get('/readiness/whatsapp-cloud', safe(() => pc.getCloudApiReadiness()));
router.get('/readiness/ai', safe(() => pc.getAiProviderReadiness()));
router.get('/readiness/rag', safe(() => pc.getRagReadiness()));
router.get('/readiness/queue', safe(() => pc.getQueueReadiness()));
router.get('/readiness/database', safe(() => pc.getDatabaseReadiness()));
router.get('/readiness/storage', safe(() => pc.getStorageReadiness()));
router.get('/readiness/integrations', safe(() => pc.getIntegrationHealth()));
router.get('/readiness/webhooks', safe(() => pc.getWebhookReadiness()));
router.get('/readiness/campaigns', safe(() => pc.getCampaignReadiness()));
router.get('/readiness/templates', safe(() => pc.getTemplateReadiness()));
router.get('/readiness/rate-limits', safe(() => pc.getRateLimitReadiness()));
router.get('/readiness/security', safe(() => pc.getSecurityPosture()));
router.get('/readiness/backup', safe(() => pc.getBackupReadiness()));
router.get('/readiness/deployment', safe(() => pc.getDeploymentChecklist()));

/* ---- Safety / quality ---- */
router.get('/safety/pii-leak-preview', safe(() => pc.getPiiLeakPreview()));
router.get('/safety/duplicate-routes', safe(() => pc.getDuplicateReport()));
router.get('/safety/duplicate-dashboard-links', safe(() => pc.getDuplicateReport()));
router.get('/safety/broken-references', safe(() => pc.getBrokenReferences()));
router.get('/safety/route-mounts', safe(() => pc.getRouteInventory()));
router.get('/safety/public-pages', safe(() => pc.getPublicPageSafety()));
router.get('/safety/log-preview', safe(() => pc.getLogPreview()));
router.get('/safety/audit-preview', safe(() => pc.getAuditPreview()));
router.get('/safety/error-patterns', safe(() => pc.getErrorPatterns()));
router.get('/safety/guard-report', safe(() => pc.getSafetyGuardReport()));

/* ---- Scoring ---- */
router.get('/score/release-readiness', safe(() => pc.getReleaseReadinessScore()));
router.get('/score/risk', safe(() => pc.getRiskScore()));
router.get('/recommendations', safe(() => pc.getRecommendations()));

/* ---- Smoke / check (preview-only; never executes anything) ---- */
router.get('/checks', safe(() => pc.getChecksPreview()));
router.post('/checks/run-preview', safe(() => pc.runChecksPreview()));
router.get('/smoke-tests', safe(() => pc.getSmokeTestsPreview()));
router.post('/smoke-tests/run-preview', safe(() => pc.runSmokeTestsPreview()));

module.exports = router;
