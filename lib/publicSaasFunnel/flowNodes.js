// lib/publicSaasFunnel/flowNodes.js
// Flow Studio trigger/action registry entries for the public funnel.
// Registration only — no live sends. Consumed by Flow Studio if present.

const TRIGGERS = [
  { id: 'public_funnel.lead_created', label: 'Public Funnel: Lead Created', payload: ['leadId', 'businessType', 'sourcePage', 'score', 'grade'] },
  { id: 'public_funnel.demo_requested', label: 'Public Funnel: Demo Requested', payload: ['demoId', 'leadId', 'businessType'] },
  { id: 'public_funnel.trial_requested', label: 'Public Funnel: Trial Requested', payload: ['trialId', 'leadId', 'requestedPlan'] },
  { id: 'public_funnel.hot_lead_detected', label: 'Public Funnel: Hot Lead Detected', payload: ['leadId', 'score', 'grade'] },
  { id: 'public_funnel.setup_preview_created', label: 'Public Funnel: Setup Preview Created', payload: ['leadId', 'businessType'] },
  { id: 'public_funnel.followup_needed', label: 'Public Funnel: Follow-up Needed', payload: ['leadId', 'nextAction'] },
  { id: 'public_funnel.reseller_inquiry_created', label: 'Public Funnel: Reseller Inquiry', payload: ['leadId', 'businessType'] },
];

const ACTIONS = [
  { id: 'create_lead_followup_draft', label: 'Create Lead Follow-up Draft', live: false },
  { id: 'create_demo_confirmation_draft', label: 'Create Demo Confirmation Draft', live: false },
  { id: 'create_trial_review_task', label: 'Create Trial Review Task', live: false },
  { id: 'create_business_setup_preview', label: 'Create Business Setup Preview', live: false },
  { id: 'create_plan_recommendation', label: 'Create Plan Recommendation', live: false },
  { id: 'notify_admin', label: 'Notify Admin (draft/notification)', live: false },
  { id: 'add_to_growth_campaign_draft', label: 'Add to Growth Campaign Draft (opted-in only)', live: false },
];

let flowStudioPresent = false;
try { require.resolve('../../mcp'); flowStudioPresent = true; } catch { flowStudioPresent = false; }

function registry() {
  return { flowStudioDetected: flowStudioPresent, triggers: TRIGGERS, actions: ACTIONS, liveSends: false };
}

module.exports = { registry, TRIGGERS, ACTIONS };
