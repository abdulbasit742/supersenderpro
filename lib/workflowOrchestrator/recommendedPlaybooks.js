// lib/workflowOrchestrator/recommendedPlaybooks.js — safe preview playbook templates.
 'use strict';
 const cfg = require('./config');
 const { normalizeDraft } = require('./workflowModel');


 function pb(name, trigger, conditions, actions) {
      return normalizeDraft({ name, trigger: { type: trigger }, conditions, actions });
 }


 const PLAYBOOKS = [
   pb('Welcome New Customer Preview', 'customer_created_preview', [{ type: 'customer_has_consent_preview', value: true }],
 [{ type: 'draft_whatsapp_reply_preview' }]),
   pb('Missed Call Follow-up Preview', 'inbound_whatsapp_message_preview', [{ type: 'inside_whatsapp_24h_window_preview'
 }], [{ type: 'draft_whatsapp_reply_preview' }]),
   pb('Abandoned Cart Recovery Preview', 'cart_abandoned_preview', [{ type: 'customer_not_opted_out_preview' }], [{ type:
 'draft_campaign_followup_preview' }]),
      pb('Payment Reminder Preview', 'payment_due_preview', [{ type: 'payment_status_matches_preview', value: 'pending' }],

 [{ type: 'create_payment_reminder_preview' }]),
   pb('Invoice Overdue Reminder Preview', 'invoice_overdue_preview', [{ type: 'invoice_overdue_days_preview', value: 3 }],
 [{ type: 'create_invoice_followup_preview' }]),
     pb('Order Status Update Preview', 'order_status_changed_preview', [], [{ type: 'draft_template_message_preview' }]),
     pb('Delivery Delay Apology Preview', 'order_status_changed_preview', [{ type: 'order_status_matches_preview', value:
 'delayed' }], [{ type: 'draft_whatsapp_reply_preview' }]),
   pb('Complaint Escalation Preview', 'support_ticket_created_preview', [{ type: 'message_contains_keyword_preview',
 value: 'complaint' }], [{ type: 'create_handoff_ticket_preview' }, { type: 'create_internal_alert_preview' }]),
   pb('Low AI Confidence Handoff Preview', 'inbound_whatsapp_message_preview', [{ type: 'ai_confidence_below_preview',
 value: 0.5 }], [{ type: 'create_handoff_ticket_preview' }]),
   pb('Dealer Bulk Order Follow-up Preview', 'dealer_order_requested_preview', [{ type: 'dealer_tier_matches_preview',
 value: 'gold' }], [{ type: 'draft_dealer_message_preview' }]),
   pb('Supplier Missing Document Follow-up Preview', 'supplier_document_missing_preview', [], [{ type:
 'draft_supplier_message_preview' }, { type: 'draft_document_request_preview' }]),
   pb('Staff Task Reminder Preview', 'staff_task_due_preview', [{ type: 'staff_role_matches_preview', value: 'agent' }],
 [{ type: 'draft_staff_task_preview' }]),
   pb('Lead Qualification Preview', 'lead_created_preview', [{ type: 'lead_score_above_preview', value: 50 }], [{ type:
 'update_lead_score_preview' }]),
   pb('Appointment Booking Preview', 'appointment_requested_preview', [{ type: 'business_hours_preview' }], [{ type:
 'draft_appointment_confirmation_preview' }]),
   pb('Loyalty Reward Reminder Preview', 'scheduled_time_preview', [{ type: 'customer_segment_matches_preview', value:
 'loyal' }], [{ type: 'draft_template_message_preview' }]),
   pb('Re-engagement Campaign Preview', 'scheduled_time_preview', [{ type: 'customer_not_opted_out_preview' }], [{ type:
 'draft_campaign_followup_preview' }]),
   pb('Opt-out Confirmation Preview', 'inbound_whatsapp_message_preview', [{ type: 'message_contains_keyword_preview',
 value: 'stop' }], [{ type: 'update_customer_tag_preview' }, { type: 'draft_whatsapp_reply_preview' }]),
 ];


 function recommendedPlaybooks() {
     const { workflowRiskScore } = require('./workflowRiskScore');
     const { workflowReadinessScore } = require('./workflowReadinessScore');
     const playbooksPreview = PLAYBOOKS.map((p) => ({
       name: p.name, trigger: p.trigger, conditions: p.conditions, actions: p.actions, guards: p.guards,
      riskScorePreview: workflowRiskScore({ workflow: p }).riskScorePreview,
      readinessScorePreview: workflowReadinessScore({ workflow: p }).readinessScorePreview,
       warnings: [], blockers: [],
     }));
     return cfg.base({ playbooksPreview });
 }
 module.exports = { recommendedPlaybooks, PLAYBOOKS };
