// lib/workflowOrchestrator/index.js — aggregator: status, summary, architecture.
  'use strict';
  const cfg = require('./config');
  const { listWorkflows } = require('./workflowRegistry');
  const { listPlaybooks } = require('./playbookRegistry');
  const { TRIGGERS, ACTIONS } = require('./workflowModel');
  const { recommendedPlaybooks } = require('./recommendedPlaybooks');
  const { detect } = require('./moduleAdapters');


  const SUPPORTED_MODULES = [
    'workflow_status', 'workflow_registry', 'playbook_registry', 'trigger_builder', 'condition_builder', 'action_builder',
       'workflow_designer', 'workflow_simulation', 'playbook_simulation', 'event_timeline', 'decision_tree', 'ai_decision',
       'whatsapp_automation', 'campaign_automation', 'lead_qualification', 'support_automation', 'handoff_automation',
       'ecommerce_automation', 'payment_reminder', 'dealer_automation', 'supplier_automation', 'staff_automation',
       'appointment_automation', 'complaint_escalation', 'loyalty_automation', 'abandoned_cart', 'document_request',
       'webhook_automation', 'rate_limit_guard', 'quiet_hours_guard', 'consent_guard', 'whatsapp_window_guard',
       'unsafe_action_blocker', 'pii_redaction', 'dry_run_plan', 'risk_score', 'readiness_score', 'audit_preview',
       'log_preview', 'recommended_playbooks', 'playbook_studio_ui',
  ];


  function getWorkflowOrchestratorStatus() {
       const det = detect();
       return cfg.base({ workflowOrchestratorEnabled: true, supportedModules: SUPPORTED_MODULES, warnings: det.warnings,
  blockers: [] });
  }


  function getWorkflowSummary() {
       const wf = listWorkflows();
       const pb = listPlaybooks();
       const recs = recommendedPlaybooks();
       return cfg.base({
         totalWorkflowsPreview: wf.workflowsPreview.length,
         totalPlaybooksPreview: pb.playbooksPreview.length,
         totalTriggersPreview: TRIGGERS.length,
         totalActionsPreview: ACTIONS.length,
      readinessScorePreview: Math.round(recs.playbooksPreview.reduce((s, p) => s + (p.readinessScorePreview || 0), 0) /
  Math.max(1, recs.playbooksPreview.length)),
      riskScorePreview: Math.round(recs.playbooksPreview.reduce((s, p) => s + (p.riskScorePreview || 0), 0) / Math.max(1,
  recs.playbooksPreview.length)),
         unsafeActionsBlockedPreview: 0,
         recommendedPlaybooksPreview: pb.playbooksPreview.slice(0, 5).map((p) => p.name),
       });
  }


  function getArchitecturePreview() {
       const det = detect();
       const integrations = Object.keys(det.adapters).filter((k) => det.adapters[k].availablePreview);
       return cfg.base({
         architecturePreview: {
             backend: (cfg.exists('server.js') || cfg.exists('app.js')) ? 'express_detected_preview' : 'unknown_preview',
             dashboard: cfg.exists('public') ? 'static_public_detected_preview' : 'unknown_preview',
        whatsapp: det.adapters.whatsapp.availablePreview || det.adapters.whatsappCloud.availablePreview ?
  'detected_preview' : 'not_detected_preview',

         ai: det.adapters.ai.availablePreview ? 'detected_preview' : 'not_detected_preview',
         queue: det.adapters.queue.availablePreview ? 'detected_preview' : 'in_memory_fallback_preview',
         integrations,
       },
     });
 }


 module.exports = { getWorkflowOrchestratorStatus, getWorkflowSummary, getArchitecturePreview, SUPPORTED_MODULES };
