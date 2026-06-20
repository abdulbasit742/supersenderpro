// lib/templateMarketplace/recipePreview.js — Simulates a recipe run as DRAFT output only.
'use strict';
const registry=require('./recipeRegistry');
const { guardInstall }=require('./safetyGuard');
// Maps action verbs to a human-readable draft outcome. NEVER executes anything live.
const ACTION_OUTCOME={
  preview_customer_360:'Open masked Customer 360 preview',
  draft_followup_message:'Draft follow-up message (not sent)',
  draft_order_confirmation:'Draft order confirmation (not sent)',
  notify_owner_preview:'Preview owner alert (not sent)',
  draft_payment_reminder:'Draft payment reminder (not sent)',
  queue_admin_review:'Queue item for admin review (local)',
  draft_channel_post:'Draft channel post (not published)',
  queue_for_approval:'Add to approval queue (local)',
  create_ticket_preview:'Preview support ticket (not created live)',
  draft_reply:'Draft reply (not sent)',
  build_onboarding_checklist:'Build onboarding checklist (preview)',
  create_owner_task_preview:'Preview owner task (not created live)',
  escalate_support_preview:'Preview support escalation (not triggered)',
  draft_campaign:'Draft campaign (not launched)',
  preview_kpi_impact:'Preview KPI impact (estimate)',
  preview_partner_lead:'Preview partner lead (masked)',
  preview_commission:'Preview commission estimate',
  suggest_kb_article:'Suggest KB article (draft)',
  draft_feedback_request:'Draft feedback request (not sent)',
};
function preview(id, input={}){
  const recipe=typeof id==='object'?id:registry.get(id);
  if(!recipe) return { ok:false, error:'unknown_recipe', id };
  const guard=guardInstall('recipe_run');
  const steps=(recipe.actions||[]).map(a=>({ action:a, outcome:ACTION_OUTCOME[a]||`Preview action: ${a}`, live:false }));
  return { ok:true, recipeId:recipe.id, title:recipe.title, trigger:recipe.trigger, dryRun:true,
    approvalRequired:recipe.approvalRequired!==false, riskLevel:recipe.riskLevel, mode:guard.mode,
    steps, note:'All actions are draft/preview only — no live send/payment/automation.', previewedAt:new Date().toISOString() };
}
module.exports={ preview, ACTION_OUTCOME };
