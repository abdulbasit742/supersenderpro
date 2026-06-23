// routes/revenueOpsRoutes.js — Express router for Revenue Operations + Sales Pipeline Command Center.
// Mounted at /api/revenue-ops. Dry-run, preview-only, read-only: no live sends, no Meta/AI/payment calls,
// no CRM/deal/customer mutation, no rep assignment. PII masked, no stack traces.
'use strict';

const express = require('express');
const router = express.Router();

const revenueOps = require('../lib/revenueOps');
const { safeError, hasLeak } = require('../lib/revenueOps/redactor');

function safe(fn) {
  return (req, res) => {
    try {
      const out = fn(req, res);
      if (out !== undefined && !res.headersSent) {
        if (hasLeak(out)) return res.status(500).json(safeError('response_blocked_possible_leak'));
        res.json(out);
      }
    } catch (e) {
      // Never expose stack traces.
      res.status(200).json(safeError('revenue_ops_preview_error'));
    }
  };
}

const body = (req) => (req && req.body) || {};

/* Core */
router.get('/status', safe(() => revenueOps.getRevenueOpsStatus()));
router.get('/dashboard-data', safe(() => revenueOps.getPipelineDashboardData()));

/* Registries */
router.get('/leads', safe(() => revenueOps.getLeadRegistryPreview()));
router.get('/opportunities', safe(() => revenueOps.getOpportunityRegistryPreview()));
router.get('/opportunities/:id/preview', safe((req) => revenueOps.getOpportunityPreview(req.params.id)));

/* Analysis (POST, body optional — defaults to deterministic sample data) */
router.post('/analyze', safe((req) => revenueOps.analyzeRevenueOpsPreview(body(req))));
router.post('/deal-score', safe((req) => revenueOps.calculateDealScorePreview(body(req))));
router.post('/pipeline-health', safe((req) => revenueOps.calculatePipelineHealthPreview(body(req))));
router.post('/forecast', safe((req) => revenueOps.calculateForecastPreview(body(req))));
router.post('/followup-readiness', safe((req) => revenueOps.calculateFollowupReadinessPreview(body(req))));
router.post('/conversion-analytics', safe((req) => revenueOps.calculateConversionAnalyticsPreview(body(req))));
router.post('/rep-performance', safe((req) => revenueOps.calculateRepPerformancePreview(body(req))));
router.post('/revenue-risk', safe((req) => revenueOps.calculateRevenueRiskPreview(body(req))));
router.post('/recommendations', safe((req) => revenueOps.getRevenueRecommendationsPreview(body(req))));
router.post('/opportunities/compare-preview', safe((req) => revenueOps.compareOpportunitiesPreview(body(req))));

/* Extended analytics (preview-only) */
router.post('/lead-score', safe((req) => revenueOps.calculateLeadScorePreview(body(req))));
router.get('/deal-aging', safe(() => revenueOps.getDealAgingPreview()));
router.post('/deal-aging', safe((req) => revenueOps.getDealAgingPreview(body(req))));
router.post('/sales-velocity', safe((req) => revenueOps.calculateSalesVelocityPreview(body(req))));
router.get('/sales-velocity', safe(() => revenueOps.calculateSalesVelocityPreview()));
router.post('/quota-attainment', safe((req) => revenueOps.calculateQuotaAttainmentPreview(body(req))));
router.get('/win-loss', safe(() => revenueOps.getWinLossAnalysisPreview()));
router.get('/next-best-actions', safe(() => revenueOps.getNextBestActionsPreview()));
router.get('/funnel', safe(() => revenueOps.getFunnelAnalysisPreview()));
router.get('/export-preview', safe(() => revenueOps.getExportPreview()));

/* Audit */
router.get('/audit-preview', safe(() => revenueOps.getRevenueAuditPreview()));

module.exports = router;
