// lib/workflowOrchestrator/workflowModel.js — vocab + draft normalization + validation. Pure functions.
 'use strict';


 const TRIGGERS = [
      'inbound_whatsapp_message_preview', 'campaign_reply_preview', 'customer_created_preview', 'lead_created_preview',
      'order_created_preview', 'order_status_changed_preview', 'payment_due_preview', 'invoice_overdue_preview',
   'cart_abandoned_preview', 'appointment_requested_preview', 'support_ticket_created_preview',
 'human_handoff_requested_preview',
   'dealer_order_requested_preview', 'supplier_document_missing_preview', 'staff_task_due_preview',
 'webhook_received_preview',
      'manual_admin_preview', 'scheduled_time_preview',
 ];


 const CONDITIONS = [
   'customer_has_consent_preview', 'customer_not_opted_out_preview', 'inside_whatsapp_24h_window_preview',
 'outside_whatsapp_24h_window_preview',
   'campaign_tag_matches_preview', 'message_contains_keyword_preview', 'customer_segment_matches_preview',
 'lead_score_above_preview',
   'order_status_matches_preview', 'invoice_overdue_days_preview', 'payment_status_matches_preview',
 'dealer_tier_matches_preview',
      'supplier_status_matches_preview', 'staff_role_matches_preview', 'business_hours_preview', 'quiet_hours_preview',
      'ai_confidence_below_preview', 'ai_confidence_above_preview', 'risk_score_below_preview',

'rate_limit_available_preview',
];


const ACTIONS = [
  'draft_whatsapp_reply_preview', 'draft_template_message_preview', 'draft_campaign_followup_preview',
'draft_ai_reply_preview',
  'create_handoff_ticket_preview', 'assign_agent_preview', 'update_customer_tag_preview', 'update_lead_score_preview',
  'create_order_note_preview', 'create_payment_reminder_preview', 'create_invoice_followup_preview',
'draft_dealer_message_preview',
  'draft_supplier_message_preview', 'draft_staff_task_preview', 'draft_support_response_preview',
'draft_appointment_confirmation_preview',
  'draft_document_request_preview', 'create_internal_alert_preview', 'create_audit_event_preview',
'call_webhook_preview', 'enqueue_job_preview',
];


// Actions that would imply a live/dangerous effect if ever executed for real.
const SENSITIVE_ACTION_HINTS = /send|charge|pay|order|inventory|invoice|live|execute/i;


function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

function normalizeDraft(input) {
     const i = isObj(input) ? input : {};
     const trigger = isObj(i.trigger) ? i.trigger : {};
     return {
       id: i.id || ('workflow_preview_' + Math.random().toString(16).slice(2, 8)),
       name: i.name || 'Untitled Workflow Preview',
       status: 'draft_preview',
    trigger: { type: trigger.type || 'manual_admin_preview', event: trigger.event || trigger.type ||
'manual_admin_preview' },
       conditions: Array.isArray(i.conditions) ? i.conditions : [],
       actions: Array.isArray(i.actions) ? i.actions.map((a) => Object.assign({ liveSend: false }, isObj(a) ? a : {})) : [],
       guards: {
         dryRun: true, consentRequired: i.guards && i.guards.consentRequired !== false,
          optOutRespected: true, whatsappWindowChecked: true, rateLimitChecked: true, piiMasked: true,
       },
     };
}

function validate(draft) {
     const warnings = []; const blockers = [];
     const d = isObj(draft) ? draft : {};
     if (!d.name || !String(d.name).trim()) blockers.push('workflow.name required');
     if (!d.trigger || !d.trigger.type) blockers.push('workflow.trigger.type required');
     else if (!TRIGGERS.includes(d.trigger.type)) warnings.push('unknown trigger type: ' + d.trigger.type);
     (d.conditions || []).forEach((c, i) => { if (c && c.field == null && c.type == null) warnings.push('condition[' + i +
'] missing field/type'); });
  if (!Array.isArray(d.actions) || !d.actions.length) warnings.push('workflow has no actions');
     (d.actions || []).forEach((a, i) => {
       const t = a && (a.type || a.action);
       if (t && !ACTIONS.includes(t)) warnings.push('action[' + i + '] non-preview type: ' + t);
       if (a && a.liveSend === true) blockers.push('action[' + i + '] has liveSend=true (forbidden in preview)');
     });
     return { validPreview: blockers.length === 0, warnings, blockers };
}


module.exports = { TRIGGERS, CONDITIONS, ACTIONS, SENSITIVE_ACTION_HINTS, normalizeDraft, validate, isObj };
